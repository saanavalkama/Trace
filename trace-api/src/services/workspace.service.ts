import { Prisma } from "../generated/prisma/client"
import { WorkspaceRole } from "../generated/prisma/enums"
import { workspaceRepository } from "../repositories/workspace.repository"
import { SendInviteDto, SendInviteServiceData, UpdateWorkspaceData } from "../types/types"
import { ConflictError, NotFoundError } from "../errors/errors"
import { inviteRepository } from "../repositories/invite.repository"
import { emailSender } from "../lib/emailSender"

const INVITE_TTL_MS = 7*24*60*60*1000

export const workspaceService = {

    create:async(name:string, userId:string)=>{
        const workspace = await workspaceRepository.createWithOwner(name, userId)
        return workspace
    },

    getWorkspacesByUserId: async(userId:string) => {
        const workspaces = await workspaceRepository.getWorkspacesByUserId(userId)
        return workspaces
    },

    getWorkspaceById: async(id:string) => {
        const workspace = await workspaceRepository.getWorkspaceById(id)
        return workspace
    },

    updateWorkspace: async(id:string, data:UpdateWorkspaceData) =>{
        const workspace = await workspaceRepository.updateWorkspace(id,data)
        if(!workspace) throw new NotFoundError("Workspace not found")
        return workspace
    },

    deleteWorkspace: async(id:string) =>{
        const workspace = await workspaceRepository.deleteWorkspace(id)
        if(!workspace) throw new NotFoundError("Workspace not found")
    },

    getMembers:async(workspaceId:string) =>{
        const members = await workspaceRepository.getMembersByWorkspaceId(workspaceId)
        return members
    },

    removeMember:async(workspaceId:string, userId:string) => {
        const target = await workspaceRepository.getMembership(workspaceId, userId)

        if(!target) throw new NotFoundError("User is not a member of this workspace")
        if(target.role === WorkspaceRole.owner) throw new ConflictError("Cannot remove the workspace owner")

        await workspaceRepository.removeMember(workspaceId, userId)
    },

    sendInvite: async(workspaceId:string, data:SendInviteServiceData )=>{

        const cleanedEmail = data.email.toLocaleLowerCase().trim()
        const expiresAt = new Date(Date.now() + INVITE_TTL_MS)

        const existingMember = await workspaceRepository.findMemberByEmail(workspaceId, cleanedEmail)
        if(existingMember){
            return {error: 'ALREADY_MEMBER' as const}
        }

        const existingInvite = await inviteRepository.findPendingByWorkspaceAndEmail(workspaceId, cleanedEmail)
        if(existingInvite){
            return {error: 'ALREADY_INVITED' as const}
        }

        const inputData = {
            email:cleanedEmail,
            role:data.role,
            expiresAt:expiresAt
        }

        let invite
        try{
            invite = await inviteRepository.createInvite(workspaceId,inputData)
        } catch(err){
            if(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'){
                return {error: 'ALREADY_INVITED' as const}
            }
            throw err
        }
        const workspace = await workspaceRepository.getWorkspaceById(workspaceId)

        if(!workspace) throw new NotFoundError("Workspace not found")
        
        await emailSender.sendInviteEmail(invite.email, workspace.name, invite.token)

        const dto:SendInviteDto = {
            id: invite.id,
            email:invite.email,
            role: invite.role,
            status: invite.status
        }

        return {error:null, data: dto}
    }
}