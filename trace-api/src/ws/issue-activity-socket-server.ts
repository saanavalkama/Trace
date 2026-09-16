import { WebSocketServer, WebSocket } from "ws"
import type { Server as HttpServer, IncomingMessage } from "http"
import type { Duplex } from "stream"
import crypto from "crypto"
import jwt from "jsonwebtoken"
import { env } from "../config/env"
import { workspaceRepository } from "../repositories/workspace.repository"
import { consumeIssueActivityUpdates } from "../shared/issue-activity-stream"

interface SubscribeMessage {
    type: "subscribe"
    accessToken: string
    workspaceId: string
    issueId: string
}

const subscribersByKey = new Map<string, Set<WebSocket>>()
const subscriptionKeyBySocket = new WeakMap<WebSocket, string>()

function subscriptionKey(workspaceId: string, issueId: string) {
    return `${workspaceId}:${issueId}`
}

function removeSubscription(socket: WebSocket) {
    const key = subscriptionKeyBySocket.get(socket)
    if (!key) return
    const sockets = subscribersByKey.get(key)
    sockets?.delete(socket)
    //remove empty sets so there's not memory leaks
    if (sockets && sockets.size === 0) subscribersByKey.delete(key)
    subscriptionKeyBySocket.delete(socket)
}

function addSubscription(socket: WebSocket, workspaceId: string, issueId: string) {
    //one socket can only ever be subscribed to exactly one issue
    removeSubscription(socket)
    const key = subscriptionKey(workspaceId, issueId)
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
        typeof (value as { issueId?: unknown }).issueId === "string"
    )
}

// Same authorization boundary the REST activity endpoint enforces (requireAuth +
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

    addSubscription(socket, message.workspaceId, message.issueId)
    send(socket, { type: "subscribed", workspaceId: message.workspaceId, issueId: message.issueId })
}

const SOCKET_PATH = "/ws/issue-activity"

export function startIssueActivitySocketServer(server: HttpServer) {
    // noServer + a manual 'upgrade' listener — see board-socket-server.ts for why:
    // ws's { server, path } wiring aborts (400s, destroys the socket) internally for
    // any upgrade whose path doesn't match, so a second WebSocketServer sharing the
    // same http.Server never gets a chance if it's registered after one that does that.
    const wss = new WebSocketServer({ noServer: true })

    function onUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer) {
        const { pathname } = new URL(request.url ?? "", "http://localhost")
        if (pathname !== SOCKET_PATH) return
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, request)
        })
    }
    server.on("upgrade", onUpgrade)

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
                console.error("Issue activity socket subscribe failed", err)
            })
        })

        socket.on("close", () => removeSubscription(socket))
    })

    let stopped = false
    const consumerName = crypto.randomUUID()
    consumeIssueActivityUpdates(
        consumerName,
        (message) => {
            const key = subscriptionKey(message.workspaceId, message.issueId)
            const sockets = subscribersByKey.get(key)
            if (!sockets) return
            for (const socket of sockets) {
                send(socket, {
                    type: "invalidate",
                    workspaceId: message.workspaceId,
                    issueId: message.issueId
                })
            }
        },
        () => stopped
    ).catch((err) => console.error("Issue activity updates consumer crashed", err))

    return () => {
        stopped = true
        server.off("upgrade", onUpgrade)
        wss.close()
    }
}
