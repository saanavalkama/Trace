import { apiClient } from "../../../api/client"
import type { MyWorkspace } from "../../../types/types"

export const workspaceService = {
    getWorkspaces: async():Promise<MyWorkspace[]> => {
        const response = await apiClient.get<MyWorkspace[]>('/workspaces')
        return response.data
    }
}