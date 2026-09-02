import { useMutation, useQueryClient } from "@tanstack/react-query"
import { sprintServices } from "../api/sprintServices"
import type { CreateSprintData } from "../../../types/types"

export function useCreateSprint() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: CreateSprintData) => sprintServices.createSprint(data),
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['sprints', variables.workspaceId] })
        },
    })
}
