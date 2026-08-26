import crypto from 'crypto'
import { eventStore } from '../shared/event-store'
import { snapshotStore } from '../shared/snapshot-store'
import {
    applyEvent,
    createInitialState,
    hydrate,
    issueCommands,
    shouldSnapshot,
    IssueState
} from '../features/issues/issue-aggregate'
import { IssueCreatedPayload, IssueEvent, IssueStatus, LinkedPayload, StoredEvent } from '../features/issues/issue-events'
import { sprintRepository } from '../repositories/sprint.repository'
import { ConflictError, NotFoundError } from '../errors/errors'
import { projectIssueEvent } from '../features/issues/issue-projector'
import {prisma} from '../db/prisma'
import app from '../app'

async function loadState(issueId: string): Promise<IssueState> {
    const snapshot = await snapshotStore.getLatest(issueId)
    const events = await eventStore.getEvents(issueId, snapshot?.version ?? 0)
    return hydrate(issueId, events as StoredEvent[], snapshot)
}

async function appendAndProject(issueId:string, expectedVersion:number, event:IssueEvent, newState:IssueState){
    const stored = await eventStore.append(issueId, expectedVersion, event)
    try{
        await projectIssueEvent(prisma, stored as unknown as StoredEvent)
    } catch(err){
        console.error(`Projection failed for event ${stored.id} ${event.type} on issue ${issueId}`, err)
    }

    if(shouldSnapshot(stored.version)){
        try{
            await snapshotStore.save(issueId, stored.version, { ...newState, version: stored.version })
        } catch(err){
            console.error(`Snapshot failed for issue ${issueId} at version ${stored.version}`, err)
        }
    }

    return stored
}

export const issueService = {

    create: async(data: IssueCreatedPayload): Promise<IssueState> => {
        const issueId = crypto.randomUUID()
        const state = createInitialState(issueId)

        const event = issueCommands.create(state, data)
        const newState = applyEvent(state, event)
        await appendAndProject(issueId, state.version, event, newState)

        return newState
    },

    getById: async(issueId: string): Promise<IssueState> => {
        const state = await loadState(issueId)
        if(!state.exists) throw new NotFoundError('Issue not found')
        return state
    },

    changeStatus: async(issueId: string, to: IssueStatus, changedBy: string): Promise<IssueState> => {
        const state = await loadState(issueId)
        const event = issueCommands.changeStatus(state, to, changedBy)
        const newState = applyEvent(state, event)
        await appendAndProject(issueId, state.version, event, newState)
        return newState
    },

    assign: async(issueId: string, userId: string, assignedBy: string): Promise<IssueState> => {
        const state = await loadState(issueId)
        const event = issueCommands.assign(state, userId, assignedBy)
        const newState = applyEvent(state, event)
        await appendAndProject(issueId, state.version, event, newState)
        return newState
    },

    unassign: async(issueId: string, userId: string, removedBy: string): Promise<IssueState> => {
        const state = await loadState(issueId)
        const event = issueCommands.unassign(state, userId, removedBy)
        const newState = applyEvent(state, event)
        await appendAndProject(issueId, state.version, event, newState)
        return newState
    },

    comment: async(issueId: string, body: string, authorId: string): Promise<IssueState> => {
        const state = await loadState(issueId)
        const event = issueCommands.comment(state, { commentId: crypto.randomUUID(), body, authorId })
        const newState = applyEvent(state, event)
        await appendAndProject(issueId, state.version, event, newState)
        return newState
    },

    addLabel: async(issueId: string, label: string, addedBy: string): Promise<IssueState> => {
        const state = await loadState(issueId)
        const event = issueCommands.addLabel(state, label, addedBy)
        const newState = applyEvent(state, event)
        await appendAndProject(issueId, state.version, event, newState)
        return newState
    },

    link: async(issueId: string, linkedIIssueId: string, linkType: LinkedPayload['linkType'], linkedBy: string): Promise<IssueState> => {
        const state = await loadState(issueId)
        const event = issueCommands.link(state, { linkedIIssueId, linkType, linkedBy })
        const newState = applyEvent(state, event)
        await appendAndProject(issueId, state.version, event, newState)
        return newState
    },

    close: async(issueId: string, closedBy: string, reason?: string): Promise<IssueState> => {
        const state = await loadState(issueId)
        const event = issueCommands.close(state, { closedBy, reason })
        const newState = applyEvent(state, event)
        await appendAndProject(issueId, state.version, event, newState)
        return newState
    },

    reopen: async(issueId: string, reopenedBy: string): Promise<IssueState> => {
        const state = await loadState(issueId)
        const event = issueCommands.reopen(state, { reopenedBy })
        const newState = applyEvent(state, event)
        await appendAndProject(issueId, state.version, event, newState)
        return newState
    },

    moveToSprint: async(issueId: string, sprintId: string, movedBy: string): Promise<IssueState> => {
        const state = await loadState(issueId)

        const sprint = await sprintRepository.getById(sprintId)
        if(!sprint) throw new NotFoundError('Sprint not found')
        if(sprint.workspaceId !== state.workspaceId) throw new ConflictError('Sprint does not belong to this issue\'s workspace')

        const event = issueCommands.moveToSprint(state, { sprintId, movedBy })
        const newState = applyEvent(state, event)
        await appendAndProject(issueId, state.version, event, newState)
        return newState
    }
}
