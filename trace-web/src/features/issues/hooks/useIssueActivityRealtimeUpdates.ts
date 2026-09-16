import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/store/authStore"
import { env } from "@/config/env"

const RECONNECT_DELAY_MS = 2000

function getIssueActivitySocketUrl(): string {
    return env.apiUrl.replace(/^http/, "ws") + "/ws/issue-activity"
}

// Same idea as useBoardRealtimeUpdates: server sends a tiny
// { type: 'invalidate', workspaceId, issueId } signal, no data payload, and we just
// invalidate the activity query the same way every mutation hook already does on its
// own success — just triggered by someone else's write this time.
export function useIssueActivityRealtimeUpdates(workspaceId: string, issueId: string) {
    const queryClient = useQueryClient()

    useEffect(() => {
        if (!workspaceId || !issueId) return

        let socket: WebSocket | null = null
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null
        let stopped = false
        let hasConnectedBefore = false

        function connect() {
            socket = new WebSocket(getIssueActivitySocketUrl())

            socket.addEventListener("open", () => {
                const accessToken = useAuthStore.getState().accessToken
                if (!accessToken || !socket) return
                socket.send(JSON.stringify({ type: "subscribe", accessToken, workspaceId, issueId }))

                // a reconnect means we might have missed updates while disconnected;
                // the initial connection doesn't need this, useGetActivity already fetched fresh
                if (hasConnectedBefore) {
                    queryClient.invalidateQueries({ queryKey: ["issueActivity", workspaceId, issueId] })
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
                    queryClient.invalidateQueries({ queryKey: ["issueActivity", workspaceId, issueId] })
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
    }, [workspaceId, issueId, queryClient])
}
