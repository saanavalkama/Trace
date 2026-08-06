import crypto from 'crypto'
import { refreshTokenRepository } from '../repositories/refreshToken.repository'
import { CreateTokenData } from '../types/types'
import { ReusedTokenError } from '../errors/errors'
import { env } from '../config/env'
import jwt from 'jsonwebtoken'


const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 *1000

function generateRawToken(){
    return crypto.randomBytes(40).toString('hex')
}

export const refreshTokenService = {

    issueNewFamily: async(userId:string) => {
        const familyId = crypto.randomUUID()
        const rawToken = generateRawToken()
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)

        const data:CreateTokenData = {
            userId,
            familyId,
            rawToken,
            expiresAt
        }

        await refreshTokenRepository.create(data)

        return {rawToken, familyId}
    },

    rotate:async(rawToken:string) => {
        const existingToken = await refreshTokenRepository.findByRawToken(rawToken)

        if(!existingToken){
            throw new ReusedTokenError()
        }

        if(existingToken.revokedAt){
            await refreshTokenRepository.revokeFamily(existingToken.familyId)
            throw new ReusedTokenError
        }

        if(existingToken.expiresAt < new Date()){
            await refreshTokenRepository.revoke(existingToken.id)
            throw new ReusedTokenError()
        }

        await refreshTokenRepository.revoke(existingToken.id)

        const newRawToken = generateRawToken()
        const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)

        const data:CreateTokenData = {
            userId: existingToken.userId,
            familyId:existingToken.familyId,
            rawToken: newRawToken,
            expiresAt
        }

        await refreshTokenRepository.create(data)

        return {rawToken: newRawToken, userId: existingToken.userId}
    },

    assignAccessToken: (userId:string, email:string) => {
        const accessToken = jwt.sign({
             sub: userId,
             email: email }, env.jwtSecret, {
            expiresIn: env.jwtExpiresIn,
        } as jwt.SignOptions)

        return accessToken
    }
}