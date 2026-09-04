import { InviteStatus, SprintStatus, WorkspaceRole } from "../generated/prisma/enums"

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

export interface CreateSprintData{
    name:string,
    startDate:Date,
    endDate:Date
}

export interface UpdateSprintData{
    name?:string,
    status?:SprintStatus,
    startDate?:Date,
    endDate?:Date
}

export interface MyWorkspaceDto{
    name:string, 
    id:string, 
    role:WorkspaceRole
}

export interface CreateWorkspaceDto {
    id: string
    name: string
    role: WorkspaceRole 
    createdAt: Date
}

export interface SprintSummaryDto {
    id: string
    name: string
    status: SprintStatus
}

export interface MemberSummaryDto {
    id: string
    email: string
    role: WorkspaceRole
}

export interface IssueBoardCardDto {
    issueId: string
    sprintId: string | null
    title: string
    status: string
    assignees: MemberSummaryDto[]
    labels: string[]
    closed: boolean
    updatedAt: Date
}

export interface ActorDto {
    id: string
    email: string
}

export interface IssueActivityDto {
    id: string
    issueId: string
    eventType: string
    actor: ActorDto | null
    payload: unknown
    createdAt: Date
}

export interface IssueCommentDto {
    id: string
    issueId: string
    body: string
    actor: ActorDto | null
    createdAt: Date
}

export interface IssueLabelDto {
    id: string
    label: string
}