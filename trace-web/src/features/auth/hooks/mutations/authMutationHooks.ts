import { useMutation } from "@tanstack/react-query"
import { authService } from "../../api/authService"
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