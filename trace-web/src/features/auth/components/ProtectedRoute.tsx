import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "../store/authStore"

// Reactive on purpose: if a request's 401 retry fails mid-session (refresh token
// expired/revoked), the response interceptor calls clearAuth(), which flips
// accessToken to null here too — this re-renders and redirects immediately,
// without needing any extra wiring at the call site that hit the error.
export default function ProtectedRoute() {
    const accessToken = useAuthStore((state) => state.accessToken)

    if (!accessToken) {
        return <Navigate to="/login" replace />
    }

    return <Outlet />
}
