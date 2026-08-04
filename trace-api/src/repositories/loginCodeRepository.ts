import {prisma} from '../db/prisma'

interface UpsertLoginCodeData {
    codeHash: string
    expiresAt: Date
    attemps:number
    inviteToken?:string
}

export const loginCodeRepository = {
    upsertForEmail: async(email:string,data:UpsertLoginCodeData) => {
        return prisma.loginCode.upsert({
            where: {email},
            update: {
                codeHash: data.codeHash,
                expiresAt: data.expiresAt,
                attemps: data.attemps,
                inviteToken: data.inviteToken ?? null
            },
            create:{
                email,
                codeHash: data.codeHash,
                expiresAt: data.expiresAt,
                attemps: data.attemps,
                inviteToken: data.inviteToken ?? null
            }
        })
    },

    incrementAttemps: async(email:string) => {
        return prisma.loginCode.update({
            where:{email},
            data:{attemps: {increment: 1}}
        })
    }, 

    findByEmail: async(email:string) => {
        return prisma.loginCode.findUnique({where:{email}})
    },

    deleteByEmail: async(email:string) => {
        return prisma.loginCode.delete({where:{email}})
    }
}