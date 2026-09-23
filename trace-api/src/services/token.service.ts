import crypto from 'crypto'
import { refreshTokenRepository } from '../repositories/refreshToken.repository'
import { CreateTokenData } from '../types/types'
import { ReusedTokenError } from '../errors/errors'
import { env } from '../config/env'
import { refreshTokenStash } from '../lib/refreshTokenStash'
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
        // Atomically marks the token used — this is the only step that decides
        // who "wins" when two requests present the same token at once, since
        // the database itself serializes the two UPDATEs.
        const claimed = await refreshTokenRepository.claim(rawToken)

        if(claimed){
            const newRawToken = generateRawToken()
            const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS)

            const data:CreateTokenData = {
                userId: claimed.userId,
                familyId: claimed.familyId,
                rawToken: newRawToken,
                expiresAt
            }

            await refreshTokenRepository.create(data)

            // Briefly stashed so a request racing against this exact token can
            // quietly receive this same result instead of being treated as reuse.
            await refreshTokenStash.set(claimed.tokenHash, { rawToken: newRawToken, userId: claimed.userId })

            return {rawToken: newRawToken, userId: claimed.userId}
        }

        // We didn't win the claim — find out why before assuming the worst.
        const existingToken = await refreshTokenRepository.findByRawToken(rawToken)

        if(!existingToken){
            throw new ReusedTokenError()
        }

        if(!existingToken.revokedAt && existingToken.expiresAt < new Date()){
            // Genuinely expired, not a race — nobody claimed it, it just died.
            await refreshTokenRepository.revoke(existingToken.id)
            throw new ReusedTokenError()
        }

        // Someone else claimed it first. If that happened within the last few
        // seconds, it's almost certainly this exact request's own race (e.g. a
        // sibling browser tab refreshing at nearly the same moment) rather than
        // a stale token showing up out of nowhere — piggyback on their result.
        // Retries briefly: the winner still has to create its new token and
        // write the stash entry, and this request can easily get here first.
        const stashed = await refreshTokenStash.getWithRetry(existingToken.tokenHash)
        if(stashed){
            return stashed
        }

        await refreshTokenRepository.revokeFamily(existingToken.familyId)
        throw new ReusedTokenError()
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