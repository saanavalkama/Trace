import { useEffect, useState, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { refreshAccessToken } from "@/api/client"
import { authService } from "../api/authService"
import { useAuthStore } from "../store/authStore"

interface AuthBootstrapProps {
    children: ReactNode
}

// The auth store is in-memory only — nothing persists across a full page reload —
// so the only way to recover an already-logged-in session is the httpOnly refresh
// cookie. This runs once before the app renders any route, so a reload on a
// protected page doesn't bounce a perfectly valid session to /login just because
// the in-memory access token hadn't been restored yet.
export default function AuthBootstrap({ children }: AuthBootstrapProps) {
    const [ready, setReady] = useState(false)

    useEffect(() => {
        let cancelled = false

        async function bootstrap() {
            try {
                // Shared/deduped with the response interceptor's own refresh calls
                // (see api/client.ts) — calling the same function here means this
                // can't race itself into a rotation conflict, e.g. React StrictMode's
                // dev-only double effect invocation hitting the single-use refresh
                // token twice and getting its whole token family revoked.
                const accessToken = await refreshAccessToken()
                useAuthStore.getState().setAccessToken(accessToken)
                const me = await authService.getMe()
                useAuthStore.getState().setAuth(accessToken, me)
            } catch {
                // no valid session — stay logged out, ProtectedRoute will redirect
            } finally {
                if (!cancelled) setReady(true)
            }
        }

        bootstrap()
        return () => {
            cancelled = true
        }
    }, [])

    if (!ready) {
        return (
            <div className="flex h-svh items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return <>{children}</>
}
