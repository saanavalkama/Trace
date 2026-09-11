import { useMutation, useQueryClient } from "@tanstack/react-query"
import { boardServices } from "../api/boardServices"
import type { BoardIssueResponse, CreateIssueData } from "@/types/types"

interface MoveIssueVariables {
    issueId: string
    to: BoardIssueResponse['status']
}

export function useMoveIssue(workspaceId: string, sprintId: string) {
    const queryClient = useQueryClient()
    const queryKey = ['board', workspaceId, sprintId]

    return useMutation({
        mutationFn: ({ issueId, to }: MoveIssueVariables) =>
            to === 'closed'
                ? boardServices.closeIssue(workspaceId, issueId)
                : boardServices.changeIssueStatus(workspaceId, issueId, to),

        onMutate: async ({ issueId, to }) => {
            await queryClient.cancelQueries({ queryKey })
            const previous = queryClient.getQueryData<BoardIssueResponse[]>(queryKey)

            queryClient.setQueryData<BoardIssueResponse[]>(queryKey, (issues) =>
                issues?.map((issue) => issue.issueId === issueId ? { ...issue, status: to } : issue)
            )

            return { previous }
        },

        onError: (_err, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
        },

        // Deliberately not invalidating the board query here. The HTTP request only
        // confirms the event was appended — the outbox relay hasn't necessarily
        // projected it yet, so an immediate refetch would race ahead of it, briefly
        // overwrite the optimistic update with stale data (visible snap-back), and then
        // snap forward again a moment later once the WS-driven invalidate (which only
        // ever fires after the projection is confirmed committed) catches up. The
        // optimistic update above is the UI until that WS message arrives; if it never
        // does (dropped connection etc.), staleTime expiry / refetchOnWindowFocus still
        // reconciles it eventually.
        onSettled: (_data, _error, variables) => {
            queryClient.invalidateQueries({ queryKey: ['issueActivity', workspaceId, variables.issueId] })
        }
    })
}

export const useCreateIssue = () => {
    const qc = useQueryClient()

    return useMutation({
        mutationFn:(data:CreateIssueData)=>boardServices.createIssue(data),
        onSuccess:(_data,variables)=>{
            qc.invalidateQueries({queryKey:['board',variables.workspaceId, variables.sprintId]})
        }
    })
}


