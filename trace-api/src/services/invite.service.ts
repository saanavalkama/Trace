import { Prisma } from "../generated/prisma/client"
import { InviteStatus } from "../generated/prisma/enums"
import { inviteRepository } from "../repositories/invite.repository"
import { workspaceRepository } from "../repositories/workspace.repository"
import { InviteContextDto } from "../types/types"

export const inviteService = {

    getInviteByToken: async(token:string) => {
        const invite = await inviteRepository.getInviteByToken(token)

        if(!invite) return {error:'NOT_FOUND' as const}
        if (invite.status === InviteStatus.accepted) return { error: 'ALREADY_ACCEPTED' as const }
        if (invite.status === InviteStatus.declined) return { error: 'ALREADY_DECLINED' as const }
        if (invite.status !== 'pending') return { error: 'ALREADY_RESOLVED' as const }
        if(invite.expiresAt < new Date()) return {error:'EXPIRED' as const}

        const data: InviteContextDto = {
            workspaceName: invite.workspace.name,
            email: invite.email,
            role: invite.role
        }

        return {error:null, data}
    },

    acceptInvite: async(token:string, userId:string) => {
        const invite = await inviteRepository.getInviteByToken(token)

        if(!invite || invite.status != InviteStatus.pending || invite.expiresAt < new Date()){
            return
        } 

        try{
            await workspaceRepository.addMember(invite.workspaceId, userId, invite.role)
        } catch(err){
            if(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'){

            }else{
                throw err
            }
        }
        await inviteRepository.markAccepted(token)
    },

    declineInvite: async(token:string) => {

        const invite = await inviteRepository.getInviteByToken(token)

        if(!invite) return {error:'NOT_FOUND' as const}
        if(invite.status != InviteStatus.pending) return {error:'ALREADY_RESOLVED' as const}
        if(invite.expiresAt < new Date()) return {error:'EXPIRED' as const}

        await inviteRepository.markDeclined(token)

        return {error:null}

    }

}