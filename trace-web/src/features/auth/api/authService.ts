import { apiClient } from "../../../api/client"
import type { VerifyCodeData, VerifyCodeResponse } from "../../../types/types"

export const authService = {

    requestCode:async(email:string) => {
        const response = await apiClient.post('/auth/request-code',{email})
        return response.data
    },

    verifyCode:async(data: VerifyCodeData) =>{
        const response = await apiClient.post<VerifyCodeResponse>('/auth/verify-code', data)
        return response.data
    }


}