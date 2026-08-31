import { create } from "zustand"
import type { AuthUser } from "../../../types/types"

interface AuthState {
    accessToken: string | null
    user: AuthUser | null
    setAuth: (accessToken: string, user: AuthUser) => void
    setAccessToken: (accessToken: string) => void
    clearAuth: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
    accessToken: null,
    user: null,
    setAuth: (accessToken, user) => set({ accessToken, user }),
    setAccessToken: (accessToken) => set({ accessToken }),
    clearAuth: () => set({ accessToken: null, user: null }),
}))
