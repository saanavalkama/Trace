import { prisma } from '../db/prisma'
import { issueQueries } from '../features/issues/issue-queries'
import { sprintRepository } from '../repositories/sprint.repository'
import { workspaceRepository } from '../repositories/workspace.repository'
import { NotFoundError } from '../errors/errors'
import { IssueBoardCardDto, MemberSummaryDto } from '../types/types'

async function assertIssueInWorkspace(workspaceId: string, issueId: string){
    const issue = await prisma.issueBoardProjection.findUnique({where:{issueId}})
    if(!issue || issue.workspaceId !== workspaceId) throw new NotFoundError('Issue not found')
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

    getActivity: async(workspaceId: string, issueId: string) => {
        await assertIssueInWorkspace(workspaceId, issueId)
        return issueQueries.getActivity(issueId)
    },

    getComments: async(workspaceId: string, issueId: string) => {
        await assertIssueInWorkspace(workspaceId, issueId)
        return issueQueries.getComments(issueId)
    },

    getLabels: async(workspaceId: string, issueId: string) => {
        await assertIssueInWorkspace(workspaceId, issueId)
        return issueQueries.getLabels(issueId)
    }
}
