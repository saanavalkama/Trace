import { apiClient } from "@/api/client"
import type { Comment, IssueActivityProjection, IssueState, Label } from "@/types/types"

export const issueService = {
    getById: async(workspaceId:string, issueId:string):Promise<IssueState> => {
        const response = await apiClient.get<IssueState>(`/workspaces/${workspaceId}/issues/${issueId}`)
        return response.data
    },

    getActivity: async(workspaceId:string, issueId:string):Promise<IssueActivityProjection[]> => {
        const response = await apiClient.get<IssueActivityProjection[]>(`/workspaces/${workspaceId}/issues/${issueId}/activity`)
        return response.data
    },

    getComments: async(workspaceId:string, issueId:string):Promise<Comment[]> => {
        const response = await apiClient.get<Comment[]>(`/workspaces/${workspaceId}/issues/${issueId}/comments`)
        return response.data
    },

     getLabels: async(workspaceId:string, issueId:string):Promise<Label[]> => {
        const response = await apiClient.get<Label[]>(`/workspaces/${workspaceId}/issues/${issueId}/labels`)
        return response.data
    }, 

    addComment: async (workspaceId: string, issueId: string, body: string): Promise<IssueState> => {
        const response = await apiClient.post<IssueState>(`/workspaces/${workspaceId}/issues/${issueId}/comments`, { body })
        return response.data
    },

    addLabel: async(workspaceId:string, issueId:string, label:string):Promise<IssueState>=>{
        const response = await apiClient.post<IssueState>(`/workspaces/${workspaceId}/issues/${issueId}/labels`, { label })
        return response.data
    },

    assign: async(workspaceId:string, issueId:string, userId:string):Promise<IssueState> => {
        const response = await apiClient.post<IssueState>(`/workspaces/${workspaceId}/issues/${issueId}/assignees`, { userId })
        return response.data
    }
}