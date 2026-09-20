import { useMutation, useQueryClient } from "@tanstack/react-query"
import { workspaceService } from "../api/workspaceService"
import type { CreateWorkspaceData, SendInvitesData, UpdateMemberRoleData } from "../../../types/types"
 
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

export function useUpdateMemberRole() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: UpdateMemberRoleData) => workspaceService.updateMemberRole(data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['members', variables.workspaceId] })
        },
    })
}