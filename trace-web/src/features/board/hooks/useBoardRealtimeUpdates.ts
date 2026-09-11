import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/store/authStore"
import { env } from "@/config/env"

const RECONNECT_DELAY_MS = 2000

function getBoardSocketUrl(): string {
    return env.apiUrl.replace(/^http/, "ws") + "/ws/board"
}

// Server sends a tiny { type: 'invalidate', workspaceId, sprintId, issueId } signal —
// no data payload. We already know how to refetch this board, so all this hook does
// is call the exact same invalidateQueries every mutation hook already calls on
// success, just triggered by someone else's write instead of our own.
export function useBoardRealtimeUpdates(workspaceId: string, sprintId: string) {
    const queryClient = useQueryClient()

    useEffect(() => {
        if (!workspaceId || !sprintId) return

        let socket: WebSocket | null = null
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null
        let stopped = false
        let hasConnectedBefore = false

        function connect() {
            socket = new WebSocket(getBoardSocketUrl())

            socket.addEventListener("open", () => {
                const accessToken = useAuthStore.getState().accessToken
                if (!accessToken || !socket) return
                socket.send(JSON.stringify({ type: "subscribe", accessToken, workspaceId, sprintId }))

                // a reconnect means we might have missed updates while disconnected;
                // the initial connection doesn't need this, useBoard already fetched fresh
                if (hasConnectedBefore) {
                    queryClient.invalidateQueries({ queryKey: ["board", workspaceId, sprintId] })
                }
                hasConnectedBefore = true
            })

            socket.addEventListener("message", (event) => {
                let message: unknown
                try {
                    message = JSON.parse(event.data)
                } catch {
                    return
                }
                if (
                    typeof message === "object" && message !== null &&
                    (message as { type?: unknown }).type === "invalidate"
                ) {
                    queryClient.invalidateQueries({ queryKey: ["board", workspaceId, sprintId] })
                }
            })

            socket.addEventListener("close", () => {
                if (stopped) return
                reconnectTimer = setTimeout(connect, RECONNECT_DELAY_MS)
            })
        }

        connect()

        return () => {
            stopped = true
            if (reconnectTimer) clearTimeout(reconnectTimer)
            socket?.close()
        }
    }, [workspaceId, sprintId, queryClient])
}
