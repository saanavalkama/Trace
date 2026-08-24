import { issueQueries } from '../features/issues/issue-queries'
import { sprintRepository } from '../repositories/sprint.repository'
import { NotFoundError } from '../errors/errors'

export const issueReadService = {

    getBoardBySprint: async(workspaceId: string, sprintId: string) => {
        const sprint = await sprintRepository.getById(sprintId)
        if(!sprint || sprint.workspaceId !== workspaceId) throw new NotFoundError('Sprint not found')

        return issueQueries.getBoardViewBySprint(sprintId)
    }
}
