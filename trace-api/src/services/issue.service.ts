import crypto from 'crypto'
import { eventStore } from '../shared/event-store'
import {
    applyEvent,
    createInitialState,
    hydrate,
    issueCommands,
    IssueState
} from '../features/issues/issue-aggregate'
import { IssueCreatedPayload, IssueStatus, LinkedPayload, StoredEvent } from '../features/issues/issue-events'
import { sprintRepository } from '../repositories/sprint.repository'
import { ConflictError, NotFoundError } from '../errors/errors'

async function loadState(issueId: string): Promise<IssueState> {
    const events = await eventStore.getEvents(issueId)
    return hydrate(issueId, events as StoredEvent[])
}

export const issueService = {

    create: async(data: IssueCreatedPayload): Promise<IssueState> => {
        const issueId = crypto.randomUUID()
        const state = createInitialState(issueId)

        const event = issueCommands.create(state, data)
        await eventStore.append(issueId, state.version, event)

        return applyEvent(state, event)
    },

    getById: async(issueId: string): Promise<IssueState> => {
        const state = await loadState(issueId)
        if(!state.exists) throw new NotFoundError('Issue not found')
        return state
    },

    changeStatus: async(issueId: string, to: IssueStatus, changedBy: string): Promise<IssueState> => {
        const state = await loadState(issueId)
        const event = issueCommands.changeStatus(state, to, changedBy)
        await eventStore.append(issueId, state.version, event)
        return applyEvent(state, event)
    },

    assign: async(issueId: string, userId: string, assignedBy: string): Promise<IssueState> => {
        const state = await loadState(issueId)
        const event = issueCommands.assign(state, userId, assignedBy)
        await eventStore.append(issueId, state.version, event)
        return applyEvent(state, event)
    },

    unassign: async(issueId: string, userId: string, removedBy: string): Promise<IssueState> => {
        const state = await loadState(issueId)
        const event = issueCommands.unassign(state, userId, removedBy)
        await eventStore.append(issueId, state.version, event)
        return applyEvent(state, event)
    },

    comment: async(issueId: string, body: string, authorId: string): Promise<IssueState> => {
        const state = await loadState(issueId)
        const event = issueCommands.comment(state, { commentId: crypto.randomUUID(), body, authorId })
        await eventStore.append(issueId, state.version, event)
        return applyEvent(state, event)
    },

    addLabel: async(issueId: string, label: string, addedBy: string): Promise<IssueState> => {
        const state = await loadState(issueId)
        const event = issueCommands.addLabel(state, label, addedBy)
        await eventStore.append(issueId, state.version, event)
        return applyEvent(state, event)
    },

    link: async(issueId: string, linkedIIssueId: string, linkType: LinkedPayload['linkType'], linkedBy: string): Promise<IssueState> => {
        const state = await loadState(issueId)
        const event = issueCommands.link(state, { linkedIIssueId, linkType, linkedBy })
        await eventStore.append(issueId, state.version, event)
        return applyEvent(state, event)
    },

    close: async(issueId: string, closedBy: string, reason?: string): Promise<IssueState> => {
        const state = await loadState(issueId)
        const event = issueCommands.close(state, { closedBy, reason })
        await eventStore.append(issueId, state.version, event)
        return applyEvent(state, event)
    },

    reopen: async(issueId: string, reopenedBy: string): Promise<IssueState> => {
        const state = await loadState(issueId)
        const event = issueCommands.reopen(state, { reopenedBy })
        await eventStore.append(issueId, state.version, event)
        return applyEvent(state, event)
    },

    moveToSprint: async(issueId: string, sprintId: string, movedBy: string): Promise<IssueState> => {
        const state = await loadState(issueId)

        const sprint = await sprintRepository.getById(sprintId)
        if(!sprint) throw new NotFoundError('Sprint not found')
        if(sprint.workspaceId !== state.workspaceId) throw new ConflictError('Sprint does not belong to this issue\'s workspace')

        const event = issueCommands.moveToSprint(state, { sprintId, movedBy })
        await eventStore.append(issueId, state.version, event)
        return applyEvent(state, event)
    }
}
