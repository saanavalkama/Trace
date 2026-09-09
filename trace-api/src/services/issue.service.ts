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
import { issueQueries } from '../features/issues/issue-queries'
import { IssueSummaryDto } from '../types/types'
import {prisma} from '../db/prisma'
import app from '../app'

async function loadState(workspaceId: string, issueId: string): Promise<IssueState> {
    const snapshot = await snapshotStore.getLatest(issueId)
    const events = await eventStore.getEvents(issueId, snapshot?.version ?? 0)
    const state = hydrate(issueId, events as StoredEvent[], snapshot)
    if(state.exists && state.workspaceId !== workspaceId) throw new NotFoundError('Issue not found')
    return state
}

async function appendAndEnqueue(issueId:string, expectedVersion:number, event:IssueEvent, newState:IssueState){
    const stored = await prisma.$transaction(async (tx) => {
        const created = await eventStore.append(issueId, expectedVersion, event, tx)
        await tx.outboxMessage.create({
            data: { aggregateId: issueId, eventId: created.id }
        })
        return created
    })

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
        if(data.sprintId){
            const sprint = await sprintRepository.getById(data.sprintId)
            if(!sprint) throw new NotFoundError('Sprint not found')
            if(sprint.workspaceId !== data.workspaceId) throw new ConflictError('Sprint does not belong to this issue\'s workspace')
        }

        const issueId = crypto.randomUUID()
        const state = createInitialState(issueId)

        const event = issueCommands.create(state, data)
        const newState = applyEvent(state, event)
        await appendAndEnqueue(issueId, state.version, event, newState)

        return newState
    },

    getById: async(workspaceId: string, issueId: string): Promise<IssueState> => {
        const state = await loadState(workspaceId, issueId)
        if(!state.exists) throw new NotFoundError('Issue not found')
        return state
    },

    search: async(workspaceId: string, query?: string): Promise<IssueSummaryDto[]> => {
        const issues = await issueQueries.getIssuesByWorkspace(workspaceId, query)

        return issues.map((issue) => ({
            issueId: issue.issueId,
            title: issue.title,
            status: issue.status,
            sprintId: issue.sprintId
        }))
    },

    changeStatus: async(workspaceId: string, issueId: string, to: IssueStatus, changedBy: string): Promise<IssueState> => {
        const state = await loadState(workspaceId, issueId)
        const event = issueCommands.changeStatus(state, to, changedBy)
        const newState = applyEvent(state, event)
        await appendAndEnqueue(issueId, state.version, event, newState)
        return newState
    },

    assign: async(workspaceId: string, issueId: string, userId: string, assignedBy: string): Promise<IssueState> => {
        const state = await loadState(workspaceId, issueId)
        const event = issueCommands.assign(state, userId, assignedBy)
        const newState = applyEvent(state, event)
        await appendAndEnqueue(issueId, state.version, event, newState)
        return newState
    },

    unassign: async(workspaceId: string, issueId: string, userId: string, removedBy: string): Promise<IssueState> => {
        const state = await loadState(workspaceId, issueId)
        const event = issueCommands.unassign(state, userId, removedBy)
        const newState = applyEvent(state, event)
        await appendAndEnqueue(issueId, state.version, event, newState)
        return newState
    },

    comment: async(workspaceId: string, issueId: string, body: string, authorId: string): Promise<IssueState> => {
        const state = await loadState(workspaceId, issueId)
        const event = issueCommands.comment(state, { commentId: crypto.randomUUID(), body, authorId })
        const newState = applyEvent(state, event)
        await appendAndEnqueue(issueId, state.version, event, newState)
        return newState
    },

    addLabel: async(workspaceId: string, issueId: string, label: string, addedBy: string): Promise<IssueState> => {
        const state = await loadState(workspaceId, issueId)
        const event = issueCommands.addLabel(state, label, addedBy)
        const newState = applyEvent(state, event)
        await appendAndEnqueue(issueId, state.version, event, newState)
        return newState
    },

    link: async(workspaceId: string, issueId: string, linkedIIssueId: string, linkType: LinkedPayload['linkType'], linkedBy: string): Promise<IssueState> => {
        const state = await loadState(workspaceId, issueId)
        const event = issueCommands.link(state, { linkedIIssueId, linkType, linkedBy })
        const newState = applyEvent(state, event)
        await appendAndEnqueue(issueId, state.version, event, newState)
        return newState
    },

    close: async(workspaceId: string, issueId: string, closedBy: string, reason?: string): Promise<IssueState> => {
        const state = await loadState(workspaceId, issueId)
        const event = issueCommands.close(state, { closedBy, reason })
        const newState = applyEvent(state, event)
        await appendAndEnqueue(issueId, state.version, event, newState)
        return newState
    },

    reopen: async(workspaceId: string, issueId: string, reopenedBy: string): Promise<IssueState> => {
        const state = await loadState(workspaceId, issueId)
        const event = issueCommands.reopen(state, { reopenedBy })
        const newState = applyEvent(state, event)
        await appendAndEnqueue(issueId, state.version, event, newState)
        return newState
    },

    moveToSprint: async(workspaceId: string, issueId: string, sprintId: string, movedBy: string): Promise<IssueState> => {
        const state = await loadState(workspaceId, issueId)

        const sprint = await sprintRepository.getById(sprintId)
        if(!sprint) throw new NotFoundError('Sprint not found')
        if(sprint.workspaceId !== state.workspaceId) throw new ConflictError('Sprint does not belong to this issue\'s workspace')

        const event = issueCommands.moveToSprint(state, { sprintId, movedBy })
        const newState = applyEvent(state, event)
        await appendAndEnqueue(issueId, state.version, event, newState)
        return newState
    }
}
