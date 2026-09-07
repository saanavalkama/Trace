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

export interface IssueState {
    id: string
    version: number
    exists: boolean
    title: string
    description: string
    status: 'open' | 'in_progress' | 'in_review' | 'closed'
    reporterId: string
    workspaceId: string
    assignees: string[]
    labels: string[]
    links: { linkedIIssueId: string, linkType: 'blocks' | 'blocked_by' | 'relates_to' | 'duplicates' }[]
    sprintId: string | null
    commentIds: string[]
}

export interface CreateIssueData{
    title: string,
    description: string,
    workspaceId:string,
    sprintId: string
}

export interface ActorSummary{
  id:string,
  email:string
}

export interface IssueActivityProjection{
  id:string,
  issueId:string,
  eventType:string,
  actor: ActorSummary | null,
  payload: Record<string, unknown>,
  createdAt:string
}

export interface Comment{
    id: string,
    issueId: string,
    body: string,
    actor: ActorSummary | null,
    createdAt: string,
}

export interface Label{
    id:string, 
    label:string
}

export interface AddCommentData{
    workspaceId:string, 
    issueId:string, 
    body:string
}

export interface AddLabelData{
    workspaceId:string,
    issueId:string,
    sprintId?:string,
    label:string
}

export interface WorkspaceMember{
    id:string
    workspaceId:string
    userId:string
    role: 'owner' | 'admin' | 'member'
    createdAt:string
    user: {
        id:string
        email:string
    }
}

export interface AssignData{
    workspaceId:string,
    issueId:string, 
    userId:string
}

export interface UnassignData{
    workspaceId:string, 
    issueId:string, 
    userId:string
}