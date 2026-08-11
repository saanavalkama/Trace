import { Request, Response } from "express"
import { requestCodeSchema, verifyCodeSchema } from "../validationSchemas/auth.schema"
import {authService} from '../services/auth.service'
import { InvalidCodeError, ReusedTokenError } from "../errors/errors"
import { env } from "../config/env"
import { refreshTokenService } from "../services/token.service"
import { userRepository } from "../repositories/user.repository"
import { refreshTokenRepository } from "../repositories/refreshToken.repository"

const SESSION_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export const authController = {

    requestCode: async (req:Request, res:Response) => {
        const result = requestCodeSchema.safeParse(req.body)
        if(!result.success){
            return res.status(400).json({errors:result.error.flatten().fieldErrors})
        }
        const email = result.data.email.toLocaleLowerCase().trim()

        await authService.requestCode(email, result.data.inviteToken)

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
            const {user, accessToken, refreshToken} = await authService.verifyCode(email, code)

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: env.nodeEnv === 'production',
                sameSite: 'lax',
                maxAge: SESSION_COOKIE_MAX_AGE_MS,
            })
            res.status(200).json({user: {id: user.id, email: user.email}, accessToken})
        } catch(err) {
            if(err instanceof InvalidCodeError){
                return res.status(400).json({message: err.message})
            }
            throw err
        }
    }, 

    refresh:async(req:Request, res:Response) => {
        const refreshToken = req.cookies?.refreshToken

        if(!refreshToken){
            return res.status(401).json({message: 'Missing refresh token'})
        }

        try{
            const {rawToken:newRefreshToken, userId } = await refreshTokenService.rotate(refreshToken)

            const user = await userRepository.findById(userId)

            if(!user){
                return res.status(404).json({message: 'User not found'})
            }

            const accessToken = refreshTokenService.assignAccessToken(user.id, user.email)

            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: env.nodeEnv === 'production',
                sameSite: 'lax',
                maxAge: SESSION_COOKIE_MAX_AGE_MS,
            })

            res.status(200).json({accessToken})
        } catch(err){
            if(err instanceof ReusedTokenError){
                res.clearCookie('refreshToken')
                return res.status(401).json({message: 'Session invalid - please log in again'})
            }
            throw err
        }
    },

    logout: async(req:Request, res:Response) => {
        const refreshToken = req.cookies?.refreshToken 

        const existingToken = await refreshTokenRepository.findByRawToken(refreshToken)

        if(existingToken){
            await refreshTokenRepository.revokeFamily(existingToken.familyId)
        }

        res.clearCookie('refreshToken')
        res.status(204).send()
    }
}