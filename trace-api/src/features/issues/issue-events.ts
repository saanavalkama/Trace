export type IssueStatus = 'open' | 'in_progress' | 'in_review' | 'closed'

export interface IssueCreatedPayload {
    title:string, 
    description:string, 
    reporterId:string,
    workspaceId:string
}

export interface StatusChangedPayload{
    from: IssueStatus,
    to:IssueStatus,
    changedBy: string
}

export interface AssignedPayload{
    userId:string, 
    assignedBy:string
}

export interface UnassignedPayload {
  userId: string;
  removedBy: string;
}

export interface CommentedPayload{
    commentId:string,
    body:string, 
    authorId:string
}

export interface LabelAddedPayload{
    label:string, 
    addedBy: string
}

export interface LinkedPayload{
    linkedIIssueId:string, 
    linkType: 'blocks' | 'blocked_by' | 'relates_to' | 'duplicates'
    linkedBy:string
}

export interface ClosedPayload{
    closedBy:string,
    reason?: string
}

export interface ReopenedPayload{
    reopenedBy:string
}

export interface MovedToSprintPayload{
    sprintId:string, 
    movedBy:string
}

export type IssueEvent = 
    | {type: 'IssueCreated', payload: IssueCreatedPayload}
    | {type: 'StatusChanged', payload: StatusChangedPayload}
    | {type: 'Assigned', payload: AssignedPayload}
    | {type: 'Unassigned', payload: UnassignedPayload}
    | {type:'Commented', payload: CommentedPayload}
    | {type: 'LabelAdded', payload: LabelAddedPayload}
    | {type: 'Linked', payload: LinkedPayload}
    | {type: 'Closed', payload: ClosedPayload}
    | {type: 'Reopened', payload: ReopenedPayload}
    | {type: 'MovedToSprint', payload: MovedToSprintPayload}

export type IssueEventType = IssueEvent['type']

export interface StoredEvent{
    id: string, 
    aggregateId:string,
    version: number, 
    type: IssueEventType,
    payload: unknown, 
    schemaVersion: number, 
    createdAt: Date
}

export const CURRENT_SCHEMA_VERSION: Record<IssueEventType, number> = {
  IssueCreated: 1,
  StatusChanged: 1,
  Assigned: 1,
  Unassigned:1,
  Commented: 1,
  LabelAdded: 1,
  Linked: 1,
  Closed: 1,
  Reopened: 1,
  MovedToSprint: 1,
};