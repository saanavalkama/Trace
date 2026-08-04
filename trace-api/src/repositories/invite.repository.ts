import { prisma } from "../db/prisma";
import { InviteStatus, WorkspaceRole } from "../generated/prisma/enums";
import crypto from 'crypto'
import { CreateInviteData } from "../types/types";

export const inviteRepository = {

    createInvite: 
        async(
            workspaceId:string, 
            data: CreateInviteData
        ) => {

                const token = crypto.randomBytes(32).toString('hex')

                return await prisma.workspaceInvite.create({
                    data:{workspaceId, ...data, token}
                })

    }, 

    getInviteByToken: async(token:string) => {
        return await prisma.workspaceInvite.findUnique({
            where: {
                token 
            },
            include: {
                workspace: {select: {name:true}}
            }
        })
    }, 

    getAllPendingInvites: async(email:string) => {
        return await prisma.workspaceInvite.findMany({
            where:{
                email, 
                status:InviteStatus.pending
            }})
    },

    markAccepted: async(token:string) => {
        return await prisma.workspaceInvite.update({
            where: {token},
            data:{
                status:InviteStatus.accepted,
                accepedAt: new Date(),
            }
        })
    },

    markDeclined: async(token:string) => {
        return await prisma.workspaceInvite.update({
            where: {token},
            data:{
                status: InviteStatus.declined
            }
        })
    }, 

    findPendingByWorkspaceAndEmail: async(workspaceId:string, email:string) => {
        return await prisma.workspaceInvite.findFirst({
            where:{workspaceId, email, status: InviteStatus.pending}
        })
    }

}