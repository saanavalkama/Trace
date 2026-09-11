import { WebSocketServer, WebSocket } from "ws"
import type { Server as HttpServer } from "http"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import { env } from "../config/env"
import { workspaceRepository } from "../repositories/workspace.repository"
import { consumeBoardUpdates } from "../shared/board-updates-stream"

interface SubscribeMessage {
    type: "subscribe"
    accessToken: string
    workspaceId: string
    sprintId: string
}

const subscribersByKey = new Map<string, Set<WebSocket>>()
const subscriptionKeyBySocket = new WeakMap<WebSocket, string>()

function subscriptionKey(workspaceId: string, sprintId: string) {
    return `${workspaceId}:${sprintId}`
}

function removeSubscription(socket: WebSocket) {
    const key = subscriptionKeyBySocket.get(socket)
    if (!key) return
    const sockets = subscribersByKey.get(key)
    sockets?.delete(socket)
    if (sockets && sockets.size === 0) subscribersByKey.delete(key)
    subscriptionKeyBySocket.delete(socket)
}

function addSubscription(socket: WebSocket, workspaceId: string, sprintId: string) {
    removeSubscription(socket)
    const key = subscriptionKey(workspaceId, sprintId)
    if (!subscribersByKey.has(key)) subscribersByKey.set(key, new Set())
    subscribersByKey.get(key)!.add(socket)
    subscriptionKeyBySocket.set(socket, key)
}

function send(socket: WebSocket, payload: unknown) {
    if (socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify(payload))
}

function isSubscribeMessage(value: unknown): value is SubscribeMessage {
    return (
        typeof value === "object" && value !== null &&
        (value as { type?: unknown }).type === "subscribe" &&
        typeof (value as { accessToken?: unknown }).accessToken === "string" &&
        typeof (value as { workspaceId?: unknown }).workspaceId === "string" &&
        typeof (value as { sprintId?: unknown }).sprintId === "string"
    )
}

// Same authorization boundary the REST board endpoint enforces (requireAuth +
// workspace membership) — a WS subscribe is a read, it doesn't get a free pass just
// because it can't go through Express middleware. Browsers can't set custom headers
// on a WS handshake, so the token travels in the first message instead of a header.
async function handleSubscribe(socket: WebSocket, message: SubscribeMessage) {
    let userId: string
    try {
        const payload = jwt.verify(message.accessToken, env.jwtSecret) as { sub: string }
        userId = payload.sub
    } catch {
        send(socket, { type: "error", message: "Invalid or expired token" })
        socket.close()
        return
    }

    const membership = await workspaceRepository.getMembership(message.workspaceId, userId)
    if (!membership) {
        send(socket, { type: "error", message: "Not a member of this workspace" })
        socket.close()
        return
    }

    addSubscription(socket, message.workspaceId, message.sprintId)
    send(socket, { type: "subscribed", workspaceId: message.workspaceId, sprintId: message.sprintId })
}

export function startBoardSocketServer(server: HttpServer) {
    const wss = new WebSocketServer({ server, path: "/ws/board" })

    wss.on("connection", (socket: WebSocket) => {
        socket.on("message", (raw: Buffer) => {
            let message: unknown
            try {
                message = JSON.parse(raw.toString())
            } catch {
                send(socket, { type: "error", message: "Invalid message" })
                return
            }

            if (!isSubscribeMessage(message)) {
                send(socket, { type: "error", message: "Unknown message type" })
                return
            }

            handleSubscribe(socket, message).catch((err) => {
                console.error("Board socket subscribe failed", err)
            })
        })

        socket.on("close", () => removeSubscription(socket))
    })

    let stopped = false
    const consumerName = crypto.randomUUID()
    consumeBoardUpdates(
        consumerName,
        (message) => {
            const key = subscriptionKey(message.workspaceId, message.sprintId)
            const sockets = subscribersByKey.get(key)
            if (!sockets) return
            for (const socket of sockets) {
                send(socket, {
                    type: "invalidate",
                    workspaceId: message.workspaceId,
                    sprintId: message.sprintId,
                    issueId: message.issueId
                })
            }
        },
        () => stopped
    ).catch((err) => console.error("Board updates consumer crashed", err))

    return () => {
        stopped = true
        wss.close()
    }
}
