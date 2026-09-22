import { useMutation, useQueryClient } from "@tanstack/react-query"
import { authService } from "../../api/authService"
import { useAuthStore } from "../../store/authStore"
import type { VerifyCodeData } from "../../../../types/types"

export const useRequestCode = () =>{
    return useMutation({
        mutationFn:(email:string)=> authService.requestCode(email)
    })
}

export const useVerifyCode = () => {
    return useMutation({
        mutationFn: (data:VerifyCodeData) => authService.verifyCode(data)
    })
}

export const useLogout = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: () => authService.logout(),
        // Clear local state even if the request itself fails (e.g. offline) —
        // the user asked to log out, so they shouldn't stay stuck looking
        // logged in locally just because the network call didn't go through.
        // ProtectedRoute reacts to accessToken going null and redirects on
        // its own, so no manual navigation is needed here.
        onSettled: () => {
            useAuthStore.getState().clearAuth()
            queryClient.clear()
        }
    })
}