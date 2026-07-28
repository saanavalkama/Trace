import { Request, Response } from "express"
import { requestCodeSchema, verifyCodeSchema } from "../validationSchemas/auth.schema"
import {authService} from '../services/auth.service'
import { InvalidCodeError } from "../errors/errors"
import { env } from "../config/env"

const SESSION_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export const authController = {

    requestCode: async (req:Request, res:Response) => {
        const result = requestCodeSchema.safeParse(req.body)
        if(!result.success){
            return res.status(400).json({errors:result.error.flatten().fieldErrors})
        }
        const email = result.data.email.toLocaleLowerCase().trim()

        await authService.requestCode(email)

        res.status(200).json({message:"If this email is valid, a code has been sent"})
    },

    verifyCode: async (req:Request, res:Response) => {
        const result = verifyCodeSchema.safeParse(req.body)
        if(!result.success){
            return res.status(400).json({errors: result.error.flatten().fieldErrors})
        }
        const email = result.data.email.toLocaleLowerCase().trim()
        const {code} = result.data

        try{
            const {user, token} = await authService.verifyCode(email, code)

            res.cookie('session', token, {
                httpOnly: true,
                secure: env.nodeEnv === 'production',
                sameSite: 'lax',
                maxAge: SESSION_COOKIE_MAX_AGE_MS,
            })
            res.status(200).json({user: {id: user.id, email: user.email}})
        } catch(err) {
            if(err instanceof InvalidCodeError){
                return res.status(400).json({message: err.message})
            }
            throw err
        }
    }
}