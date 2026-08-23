import {
    IssueEvent,
    IssueStatus,
    IssueCreatedPayload,
    StatusChangedPayload,
    AssignedPayload,
    UnassignedPayload,
    CommentedPayload,
    LabelAddedPayload,
    LinkedPayload,
    ClosedPayload,
    ReopenedPayload,
    MovedToSprintPayload,
    StoredEvent
} from "./issue-events"
import { ConflictError, NotFoundError } from "../../errors/errors"

export interface IssueLink {
    linkedIIssueId: string
    linkType: LinkedPayload['linkType']
}

export interface IssueState {
    id: string
    version: number
    exists: boolean
    title: string
    description: string
    status: IssueStatus
    reporterId: string
    workspaceId: string
    assignees: string[]
    labels: string[]
    links: IssueLink[]
    sprintId: string | null
    commentIds: string[]
}

export function createInitialState(id: string): IssueState {
    return {
        id,
        version: 0,
        exists: false,
        title: '',
        description: '',
        status: 'open',
        reporterId: '',
        workspaceId: '',
        assignees: [],
        labels: [],
        links: [],
        sprintId: null,
        commentIds: []
    }
}

export function applyEvent(state: IssueState, event: IssueEvent): IssueState {
    switch (event.type) {
        case 'IssueCreated':
            return {
                ...state,
                exists: true,
                title: event.payload.title,
                description: event.payload.description,
                reporterId: event.payload.reporterId,
                workspaceId: event.payload.workspaceId,
                status: 'open'
            }

        case 'StatusChanged':
            return { ...state, status: event.payload.to }

        case 'Assigned':
            if (state.assignees.includes(event.payload.userId)) return state
            return { ...state, assignees: [...state.assignees, event.payload.userId] }

        case 'Unassigned':
            return { ...state, assignees: state.assignees.filter(id => id !== event.payload.userId) }

        case 'Commented':
            return { ...state, commentIds: [...state.commentIds, event.payload.commentId] }

        case 'LabelAdded':
            if (state.labels.includes(event.payload.label)) return state
            return { ...state, labels: [...state.labels, event.payload.label] }

        case 'Linked':
            return {
                ...state,
                links: [...state.links, { linkedIIssueId: event.payload.linkedIIssueId, linkType: event.payload.linkType }]
            }

        case 'Closed':
            return { ...state, status: 'closed' }

        case 'Reopened':
            return { ...state, status: 'open' }

        case 'MovedToSprint':
            return { ...state, sprintId: event.payload.sprintId }

        default: {
            const _exhaustive: never = event
            return _exhaustive
        }
    }
}

export function hydrate(aggregateId: string, events: StoredEvent[]): IssueState {
    let state = createInitialState(aggregateId)

    for (const stored of events) {
        const event = { type: stored.type, payload: stored.payload } as IssueEvent
        state = { ...applyEvent(state, event), version: stored.version }
    }

    return state
}

function assertExists(state: IssueState): void {
    if (!state.exists) throw new NotFoundError('Issue not found')
}

export const issueCommands = {

    create: (state: IssueState, payload: IssueCreatedPayload): IssueEvent => {
        if (state.exists) throw new ConflictError('Issue already exists')
        return { type: 'IssueCreated', payload }
    },

    changeStatus: (state: IssueState, to: IssueStatus, changedBy: string): IssueEvent => {
        assertExists(state)
        if (state.status === 'closed') throw new ConflictError('Cannot change status of a closed issue, reopen it first')
        if (state.status === to) throw new ConflictError(`Issue is already ${to}`)

        const payload: StatusChangedPayload = { from: state.status, to, changedBy }
        return { type: 'StatusChanged', payload }
    },

    assign: (state: IssueState, userId: string, assignedBy: string): IssueEvent => {
        assertExists(state)
        if (state.assignees.includes(userId)) throw new ConflictError('User is already assigned to this issue')

        const payload: AssignedPayload = { userId, assignedBy }
        return { type: 'Assigned', payload }
    },

    unassign: (state: IssueState, userId: string, removedBy: string): IssueEvent => {
        assertExists(state)
        if (!state.assignees.includes(userId)) throw new NotFoundError('User is not assigned to this issue')

        const payload: UnassignedPayload = { userId, removedBy }
        return { type: 'Unassigned', payload }
    },

    comment: (state: IssueState, payload: CommentedPayload): IssueEvent => {
        assertExists(state)
        return { type: 'Commented', payload }
    },

    addLabel: (state: IssueState, label: string, addedBy: string): IssueEvent => {
        assertExists(state)
        if (state.labels.includes(label)) throw new ConflictError('Label already added to this issue')

        const payload: LabelAddedPayload = { label, addedBy }
        return { type: 'LabelAdded', payload }
    },

    link: (state: IssueState, payload: LinkedPayload): IssueEvent => {
        assertExists(state)
        if (payload.linkedIIssueId === state.id) throw new ConflictError('An issue cannot be linked to itself')

        const alreadyLinked = state.links.some(
            link => link.linkedIIssueId === payload.linkedIIssueId && link.linkType === payload.linkType
        )
        if (alreadyLinked) throw new ConflictError('Issue is already linked with this link type')

        return { type: 'Linked', payload }
    },

    close: (state: IssueState, payload: ClosedPayload): IssueEvent => {
        assertExists(state)
        if (state.status === 'closed') throw new ConflictError('Issue is already closed')

        return { type: 'Closed', payload }
    },

    reopen: (state: IssueState, payload: ReopenedPayload): IssueEvent => {
        assertExists(state)
        if (state.status !== 'closed') throw new ConflictError('Only closed issues can be reopened')

        return { type: 'Reopened', payload }
    },

    moveToSprint: (state: IssueState, payload: MovedToSprintPayload): IssueEvent => {
        assertExists(state)
        if (state.sprintId === payload.sprintId) throw new ConflictError('Issue is already in this sprint')

        return { type: 'MovedToSprint', payload }
    }
}
