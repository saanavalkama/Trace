import { InviteStatus, WorkspaceRole } from "../generated/prisma/enums"

export interface UpdateWorkspaceData{
    name:string
}

export interface SendInviteServiceData{
    email:string,
    role:WorkspaceRole
}

export interface CreateInviteData extends SendInviteServiceData{
    expiresAt:Date
}

export interface SendInviteDto{
    id: string,
    email:string, 
    role:WorkspaceRole,
    status: InviteStatus
}

export interface InviteContextDto{
    workspaceName: string,
    email:string, 
    role: WorkspaceRole
}

export interface CreateTokenData{
    userId:string, 
    familyId:string, 
    rawToken: string, 
    expiresAt:Date
}