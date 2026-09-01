import { useMutation, useQueryClient } from "@tanstack/react-query"
import { workspaceService } from "../api/workspaceService"
import type { CreateWorkspaceData, SendInvitesData } from "../../../types/types"
 
export function useCreateWorkspace() {
    const queryClient = useQueryClient()
 
    return useMutation({
        mutationFn: (data: CreateWorkspaceData) => workspaceService.createWorkspace(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['workspaces'] })
        },
    })
}
 
export function useSendManyInvites() {
    return useMutation({
        mutationFn: (data: SendInvitesData) => workspaceService.sendManyInvites(data),
    })
}