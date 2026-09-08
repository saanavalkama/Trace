import { prisma } from '../db/prisma'
import { issueQueries } from '../features/issues/issue-queries'
import { sprintRepository } from '../repositories/sprint.repository'
import { workspaceRepository } from '../repositories/workspace.repository'
import { userRepository } from '../repositories/user.repository'
import { NotFoundError } from '../errors/errors'
import { CommentedPayload, LabelAddedPayload, LinkedPayload } from '../features/issues/issue-events'
import { ActorDto, IssueActivityDto, IssueBoardCardDto, IssueCommentDto, IssueLabelDto, IssueLinkDto, MemberSummaryDto } from '../types/types'

async function assertIssueInWorkspace(workspaceId: string, issueId: string){
    const issue = await prisma.issueBoardProjection.findUnique({where:{issueId}})
    if(!issue || issue.workspaceId !== workspaceId) throw new NotFoundError('Issue not found')
}

async function resolveActors(actorIds: string[]): Promise<Map<string, ActorDto>> {
    const uniqueIds = [...new Set(actorIds)]
    const actors = await userRepository.findByIds(uniqueIds)
    return new Map(actors.map((actor) => [actor.id, { id: actor.id, email: actor.email }]))
}

async function resolveLinkedIssues(issueIds: string[]): Promise<Map<string, { title: string, status: string }>> {
    const uniqueIds = [...new Set(issueIds)]
    if(uniqueIds.length === 0) return new Map()
    const issues = await issueQueries.getByIds(uniqueIds)
    return new Map(issues.map((issue) => [issue.issueId, { title: issue.title, status: issue.status }]))
}

export const issueReadService = {

    getBoardBySprint: async(workspaceId: string, sprintId: string):Promise<IssueBoardCardDto[]> => {
        const sprint = await sprintRepository.getById(sprintId)
        if(!sprint || sprint.workspaceId !== workspaceId) throw new NotFoundError('Sprint not found')

        const [issues, members] = await Promise.all([
            issueQueries.getBoardViewBySprint(sprintId),
            workspaceRepository.getMembersByWorkspaceId(workspaceId)
        ])

        //make map so lookups are o(1)
        const membersByUserId = new Map<string, MemberSummaryDto>(
            members.map((member) => [member.user.id, { id: member.user.id, email: member.user.email, role: member.role }])
        )

        return issues.map((issue) => ({
            issueId: issue.issueId,
            sprintId: issue.sprintId,
            title: issue.title,
            status: issue.status,
            assignees: issue.assigneeIds
                .map((userId) => membersByUserId.get(userId))
                .filter((member): member is MemberSummaryDto => member !== undefined),
            labels: issue.labels,
            closed: issue.closed,
            updatedAt: issue.updatedAt
        }))
    },

    getActivity: async(workspaceId: string, issueId: string): Promise<IssueActivityDto[]> => {
        await assertIssueInWorkspace(workspaceId, issueId)
        const activity = await issueQueries.getActivity(issueId)
        const actorsById = await resolveActors(activity.map((entry) => entry.actorId))

        return activity.map((entry) => ({
            id: entry.id,
            issueId: entry.issueId,
            eventType: entry.eventType,
            actor: actorsById.get(entry.actorId) ?? null,
            payload: entry.payload,
            createdAt: entry.createdAt
        }))
    },

    getComments: async(workspaceId: string, issueId: string): Promise<IssueCommentDto[]> => {
        await assertIssueInWorkspace(workspaceId, issueId)
        const comments = await issueQueries.getComments(issueId)
        const actorsById = await resolveActors(comments.map((entry) => entry.actorId))

        return comments.map((entry) => ({
            id: entry.id,
            issueId: entry.issueId,
            body: (entry.payload as unknown as CommentedPayload).body,
            actor: actorsById.get(entry.actorId) ?? null,
            createdAt: entry.createdAt
        }))
    },

    getLabels: async(workspaceId: string, issueId: string): Promise<IssueLabelDto[]> => {
        await assertIssueInWorkspace(workspaceId, issueId)
        const labels = await issueQueries.getLabels(issueId)

        return labels.map((entry) => ({
            id: entry.id,
            label: (entry.payload as unknown as LabelAddedPayload).label
        }))
    },

    getLinks: async(workspaceId: string, issueId: string): Promise<IssueLinkDto[]> => {
        await assertIssueInWorkspace(workspaceId, issueId)
        const links = await issueQueries.getLinks(issueId)

        const linkedIssuesById = await resolveLinkedIssues(
            links.map((entry) => (entry.payload as unknown as LinkedPayload).linkedIIssueId)
        )

        return links
            .map((entry): IssueLinkDto | undefined => {
                const payload = entry.payload as unknown as LinkedPayload
                const linkedIssue = linkedIssuesById.get(payload.linkedIIssueId)
                if(!linkedIssue) return undefined

                return {
                    linkId: entry.id,
                    issueName: linkedIssue.title,
                    issueStatus: linkedIssue.status,
                    linkType: payload.linkType
                }
            })
            .filter((link): link is IssueLinkDto => link !== undefined)
    }
}
