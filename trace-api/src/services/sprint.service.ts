import { sprintRepository } from '../repositories/sprint.repository'
import { CreateSprintData, SprintSummaryDto, UpdateSprintData } from '../types/types'
import { ConflictError, NotFoundError } from '../errors/errors'

export const sprintService = {

    create: async(workspaceId:string, data:CreateSprintData) => {
        if(data.endDate <= data.startDate){
            throw new ConflictError('End date must be after start date')
        }
        return sprintRepository.create(workspaceId, data)
    },

    getByWorkspaceId: async(workspaceId:string):Promise<SprintSummaryDto[]> => {
        const sprints = await sprintRepository.getByWorkspaceId(workspaceId)
        const dto:SprintSummaryDto[]= sprints.map((s)=>({id:s.id, name:s.name, status: s.status}))
        return dto
    },

    getById: async(id:string) => {
        const sprint = await sprintRepository.getById(id)
        if(!sprint) throw new NotFoundError('Sprint not found')
        return sprint
    },

    update: async(id:string, data:UpdateSprintData) => {
        const current = await sprintRepository.getById(id)
        if(!current) throw new NotFoundError('Sprint not found')

        const startDate = data.startDate ?? current.startDate
        const endDate = data.endDate ?? current.endDate
        if(endDate <= startDate){
            throw new ConflictError('End date must be after start date')
        }

        const sprint = await sprintRepository.update(id, data)
        if(!sprint) throw new NotFoundError('Sprint not found')
        return sprint
    },

    delete: async(id:string) => {
        const sprint = await sprintRepository.delete(id)
        if(!sprint) throw new NotFoundError('Sprint not found')
    }
}
