import {prisma} from '../db/prisma'
import crypto from 'crypto'
import { CreateTokenData } from '../types/types'

function hashToken(token:string){
    return crypto.createHash('sha256').update(token).digest('hex')
}

export const refreshTokenRepository = {
    hashToken,

    create:async(data:CreateTokenData) => {
        return prisma.refreshToken.create({
            data:{
                userId:data.userId,
                familyId:data.familyId,
                tokenHash: hashToken(data.rawToken),
                expiresAt: data.expiresAt
            }
        })
    },

    findByRawToken: async(rawToken:string) => {
        return prisma.refreshToken.findUnique({
            where:{
                tokenHash: hashToken(rawToken)
            }
        })
    },

    // Atomically marks a token used, but only if nobody's already done so —
    // the WHERE clause is the whole point: two concurrent calls for the same
    // token can't both see revokedAt as null, because the database serializes
    // concurrent UPDATEs to the same row. Exactly one of them affects a row.
    claim: async(rawToken:string) => {
        const tokenHash = hashToken(rawToken)
        const { count } = await prisma.refreshToken.updateMany({
            where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
            data: { revokedAt: new Date() }
        })
        if(count === 0) return null
        return prisma.refreshToken.findUnique({ where: { tokenHash } })
    },

    revoke: async(id:string) => {
        return prisma.refreshToken.update({
            where:{id},
            data:{
                revokedAt: new Date()
            }
        })
    },

    revokeFamily: async(familyId:string) => {
        return prisma.refreshToken.updateMany({
            where:{familyId, revokedAt:null},
            data:{
                revokedAt:new Date()
            }

        })
    }
}