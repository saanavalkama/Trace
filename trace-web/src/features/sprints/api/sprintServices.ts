import { apiClient } from "../../../api/client"
import type { CreateSprintData, SprintResponse, SprintSummaryResponse } from "../../../types/types"

export const sprintServices = {
    getSprintsByWorkspaceId: async(workspaceId:string):Promise<SprintSummaryResponse[]> => {
        const response = await apiClient.get<SprintSummaryResponse[]>(`/workspaces/${workspaceId}/sprints`)
        return response.data
    },
    createSprint: async(data:CreateSprintData):Promise<SprintResponse> => {
        const response = await apiClient.post<SprintResponse>(`/workspaces/${data.workspaceId}/sprints`, {
            name: data.name,
            startDate: data.startDate,
            endDate: data.endDate
        })
        return response.data
    }
}