export interface VerifyCodeData{
    code:string,
    email:string
}

export interface AuthUser{
    id:string,
    email:string
}

export interface VerifyCodeResponse{
    user:AuthUser,
    accessToken:string
}

export interface MyWorkspace{
    name:string,
    id:string, 
    role: 'owner' | 'admin' | 'member'
}

export interface CreateWorkspaceData{
    name:string
}

export interface CreateWorkspaceResponseData{
    id:string, 
    name:string, 
    role: 'owner' | 'admin' | 'member'
    createdAt:Date
}

export interface PendingInvites{
    email:string, 
    role:'admin' | 'member'
}

export interface SendInvitesData{
    workspaceId:string, 
    invites:PendingInvites[]
}

export interface SendInviteDto {
    id: string
    email: string
    role: 'admin' | 'member'
    status: string
}

export interface SendManyInvitesResult {
    succeeded: SendInviteDto[]
    failed: { email: string; reason: string }[]
}

export interface SprintSummaryResponse {
    id: string
    name: string
    status: string
}

export interface CreateSprintData {
    workspaceId: string
    name: string
    startDate: string
    endDate: string
}

export interface SprintResponse {
    id: string
    workspaceId: string
    name: string
    status: 'planned' | 'active' | 'completed'
    startDate: string
    endDate: string
    createdAt: string
}

export interface MemberSummaryResponse {
    id: string
    email: string
    role: 'owner' | 'admin' | 'member'
}

export interface BoardIssueResponse{
      issueId: string,
        sprintId: string,
        title: string,
        status: 'open' | 'in_progress' | 'in_review' | 'closed',
        assignees:MemberSummaryResponse[] 
        labels: string[]
        closed: boolean,
        updatedAt: string
}