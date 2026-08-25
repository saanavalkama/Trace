import { prisma } from '../db/prisma'
import { issueQueries } from '../features/issues/issue-queries'
import { sprintRepository } from '../repositories/sprint.repository'
import { NotFoundError } from '../errors/errors'

async function assertIssueInWorkspace(workspaceId: string, issueId: string){
    const issue = await prisma.issueBoardProjection.findUnique({where:{issueId}})
    if(!issue || issue.workspaceId !== workspaceId) throw new NotFoundError('Issue not found')
}

export const issueReadService = {

    getBoardBySprint: async(workspaceId: string, sprintId: string) => {
        const sprint = await sprintRepository.getById(sprintId)
        if(!sprint || sprint.workspaceId !== workspaceId) throw new NotFoundError('Sprint not found')

        return issueQueries.getBoardViewBySprint(sprintId)
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
