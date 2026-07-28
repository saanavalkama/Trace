import {email, z} from 'zod'

export const requestCodeSchema = z.object({
    email: z.string().email()
})

export const verifyCodeSchema = z.object({
    code: z.string().length(6),
    email: z.string().email()
})

export type RequestCodeInput = z.infer<typeof requestCodeSchema>
export type VerifyCodeInput = z.infer<typeof verifyCodeSchema>