export interface VerifyCodeData{
    code:string,
    email:string
}

export interface AuthUser{
    id:string,
    email:string
}

export interface VerifyCodeResponse{
    user:AuthUser,
    accessToken:string
}