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