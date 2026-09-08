import { apiClient } from "../../../api/client"
import type { AuthUser, VerifyCodeData, VerifyCodeResponse } from "../../../types/types"

export const authService = {

    requestCode:async(email:string) => {
        const response = await apiClient.post('/auth/request-code',{email})
        return response.data
    },

    verifyCode:async(data: VerifyCodeData) =>{
        const response = await apiClient.post<VerifyCodeResponse>('/auth/verify-code', data)
        return response.data
    },

    getMe:async():Promise<AuthUser> => {
        const response = await apiClient.get<AuthUser>('/auth/me')
        return response.data
    }

}