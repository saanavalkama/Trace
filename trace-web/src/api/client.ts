import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { env } from "../config/env";
import { useAuthStore } from "../features/auth/store/authStore";

export const apiClient = axios.create({
    baseURL: env.apiUrl,
    withCredentials: true
})

apiClient.interceptors.request.use((config) => {
    const accessToken = useAuthStore.getState().accessToken
    if (accessToken) {
        config.headers.set("Authorization", `Bearer ${accessToken}`)
    }
    return config
})

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
    _retried?: boolean
}

let refreshPromise: Promise<string> | null = null

function refreshAccessToken(): Promise<string> {
    if (!refreshPromise) {
        refreshPromise = axios
            .post<{ accessToken: string }>(`${env.apiUrl}/auth/refresh`, {}, { withCredentials: true })
            .then((response) => response.data.accessToken)
            .finally(() => {
                refreshPromise = null
            })
    }
    return refreshPromise
}
/*
1. One shared variable: Promise<string> | null — starts null
2. One function: if the shared variable is null, start the real refresh call and store 
   the resulting Promise in the variable; either way, return whatever's in the variable
3. One response interceptor: on error, check (is it 401? already retried? is it the 
   refresh call itself?) — if it passes all checks, mark as retried, await the shared 
   function, update stored token, retry the original request with the new token; 
   if refresh itself fails, clear auth entirely
*/

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as RetriableRequestConfig | undefined
        const isRefreshCall = originalRequest?.url?.includes("/auth/refresh")

        if (error.response?.status !== 401 || !originalRequest || originalRequest._retried || isRefreshCall) {
            return Promise.reject(error)
        }
        originalRequest._retried = true

        try {
            const accessToken = await refreshAccessToken()
            useAuthStore.getState().setAccessToken(accessToken)
            originalRequest.headers.set("Authorization", `Bearer ${accessToken}`)
            return apiClient(originalRequest)
        } catch (refreshError) {
            useAuthStore.getState().clearAuth()
            return Promise.reject(refreshError)
        }
    }
)