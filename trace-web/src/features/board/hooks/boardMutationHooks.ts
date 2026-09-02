import { useMutation, useQueryClient } from "@tanstack/react-query"
import { boardServices } from "../api/boardServices"
import type { BoardIssueResponse } from "@/types/types"

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

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey })
        }
    })
}
