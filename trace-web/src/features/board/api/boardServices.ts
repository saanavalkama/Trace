import { apiClient } from "@/api/client"
import type { BoardIssueResponse } from "@/types/types"

export const boardServices = {
    getBoardBySprint:async(workspaceId:string, sprintId:string): Promise<BoardIssueResponse[]> => {
        const response = await apiClient.get<BoardIssueResponse[]>(`/workspaces/${workspaceId}/sprints/${sprintId}/board`)
        return response.data
    },

    changeIssueStatus: async(workspaceId:string, issueId:string, to: BoardIssueResponse['status']): Promise<BoardIssueResponse> => {
        const response = await apiClient.patch<BoardIssueResponse>(`/workspaces/${workspaceId}/issues/${issueId}/status`, { to })
        return response.data
    },

    closeIssue: async(workspaceId:string, issueId:string): Promise<BoardIssueResponse> => {
        const response = await apiClient.post<BoardIssueResponse>(`/workspaces/${workspaceId}/issues/${issueId}/close`, {})
        return response.data
    },

    reopenIssue: async(workspaceId:string, issueId:string): Promise<BoardIssueResponse> => {
        const response = await apiClient.post<BoardIssueResponse>(`/workspaces/${workspaceId}/issues/${issueId}/reopen`, {})
        return response.data
    }
}