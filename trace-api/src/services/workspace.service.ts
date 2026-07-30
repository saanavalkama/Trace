import { WorkspaceRole } from "../generated/prisma/enums"
import { workspaceRepository } from "../repositories/workspace.repository"
import { UpdateWorkspaceData } from "../types/types"
import { ConflictError, NotFoundError } from "../errors/errors"

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
    }
}