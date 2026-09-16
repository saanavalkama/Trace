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
import { CommentedPayload, IssueCreatedPayload, IssueEvent, IssueStatus, LinkedPayload, StoredEvent } from '../features/issues/issue-events'
import { sprintRepository } from '../repositories/sprint.repository'
import { userRepository } from '../repositories/user.repository'
import { ConflictError, NotFoundError } from '../errors/errors'
import { issueQueries } from '../features/issues/issue-queries'
import { IssueCommentDto, IssueLabelDto, IssueSummaryDto } from '../types/types'
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

    // Sourced from state rather than the (outbox-fed) projection: reads happen right
    // after loadState hydrates the event log, so this is always immediately consistent
    // with the write that just happened — no projection lag to race against. `id` is
    // synthesized as the label text itself, which is safe because the write model
    // already dedupes labels per issue (see issueCommands.addLabel).
    getLabels: async(workspaceId: string, issueId: string): Promise<IssueLabelDto[]> => {
        const state = await loadState(workspaceId, issueId)
        if(!state.exists) throw new NotFoundError('Issue not found')
        return state.labels.map((label) => ({ id: label, label }))
    },

    // Also sourced straight from the event log rather than the projection, but unlike
    // getLabels the reduced IssueState doesn't carry comment bodies (only commentIds) —
    // the reducer never folds payload details into state for this event type. So this
    // skips loadState entirely (it would fetch the snapshot + tail, then this would
    // redundantly re-fetch the full history on top of that) and reads the raw events
    // once. IssueCreated is always version 1 — issueCommands.create refuses to run if
    // the issue already exists, so nothing can precede it — which gives existence and
    // workspace checks for free from events[0] instead of a second query.
    getComments: async(workspaceId: string, issueId: string): Promise<IssueCommentDto[]> => {
        const events = await eventStore.getEvents(issueId)
        if(events.length === 0) throw new NotFoundError('Issue not found')

        const created = events[0].payload as unknown as IssueCreatedPayload
        if(created.workspaceId !== workspaceId) throw new NotFoundError('Issue not found')

        const commentEvents = events.filter((event) => event.type === 'Commented')
        const actorsById = await userRepository.resolveActorsById(
            commentEvents.map((event) => (event.payload as unknown as CommentedPayload).authorId)
        )

        return commentEvents.map((event) => {
            const payload = event.payload as unknown as CommentedPayload
            return {
                id: payload.commentId,
                issueId,
                body: payload.body,
                actor: actorsById.get(payload.authorId) ?? null,
                createdAt: event.createdAt
            }
        })
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
