import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "../store/authStore"
import Navbar from "@/components/Navbar"

// Reactive on purpose: if a request's 401 retry fails mid-session (refresh token
// expired/revoked), the response interceptor calls clearAuth(), which flips
// accessToken to null here too — this re-renders and redirects immediately,
// without needing any extra wiring at the call site that hit the error.
export default function ProtectedRoute() {
    const accessToken = useAuthStore((state) => state.accessToken)

    if (!accessToken) {
        return <Navigate to="/login" replace />
    }

    // Fixed-height shell (not each page re-asserting min-h-svh) so the navbar
    // stays pinned while whatever route is active fills — and internally
    // scrolls — exactly the space left under it. w-screen + the negative
    // margin breaks out of #root's global width cap (index.css — a 1126px
    // centered column meant for the marketing page), which every protected
    // route needs to escape to use the full viewport, not just WorkspaceLayout.
    return (
        <div className="flex h-svh w-screen ml-[calc(50%-50vw)] flex-col bg-background">
            <Navbar />
            <div className="min-h-0 flex-1 overflow-hidden">
                <Outlet />
            </div>
        </div>
    )
}
