import {prisma} from '../db/prisma'

interface UpsertLoginCodeData {
    codeHash: string
    expiresAt: Date
    attemps:number
}

export const loginCodeRepository = {
    upsertForEmail: async(email:string,data:UpsertLoginCodeData) => {
        return prisma.loginCode.upsert({
            where: {email},
            update: {
                codeHash: data.codeHash,
                expiresAt: data.expiresAt,
                attemps: data.attemps
            },
            create:{
                email,
                codeHash: data.codeHash,
                expiresAt: data.expiresAt,
                attemps: data.attemps
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