import { apiClient } from "../../../api/client"
import type { CreateWorkspaceData, CreateWorkspaceResponseData, MyWorkspace, SendInvitesData, SendManyInvitesResult } from "../../../types/types"

export const workspaceService = {
    getWorkspaces: async():Promise<MyWorkspace[]> => {
        const response = await apiClient.get<MyWorkspace[]>('/workspaces')
        return response.data
    },
    createWorkspace:async(data:CreateWorkspaceData):Promise<CreateWorkspaceResponseData>=>{
        const response = await apiClient.post<CreateWorkspaceResponseData>('/workspaces',data)
        return response.data
    },
    sendManyInvites: async(data:SendInvitesData):Promise<SendManyInvitesResult>=>{
        const response = await apiClient.post<SendManyInvitesResult>(`/workspaces/${data.workspaceId}/many-invites`,{invites:data.invites})
        return response.data
    }
}