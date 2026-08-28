import axios from "axios";
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