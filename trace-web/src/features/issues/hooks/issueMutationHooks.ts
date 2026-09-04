import type { AddCommentData, AddLabelData } from "@/types/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { issueService } from "../api/issueService"

export const useAddComment = ()=>{
    const qc = useQueryClient()
    return useMutation({
        mutationFn:(data:AddCommentData) => issueService.addComment(data.workspaceId, data.issueId, data.body),
        onSuccess:(_,variables)=>{
            qc.invalidateQueries({queryKey:['comments', variables.workspaceId, variables.issueId]})
        }
    })
}

export const useAddLabel = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: (data:AddLabelData) => issueService.addLabel(data.workspaceId, data.issueId, data.label),
         onSuccess: (_data, { workspaceId, issueId, sprintId }) => {
            qc.invalidateQueries({ queryKey: ['labels', workspaceId, issueId] })
            if (sprintId) qc.invalidateQueries({ queryKey: ['board', workspaceId, sprintId] })
            qc.invalidateQueries({queryKey:['issueActivity', workspaceId, issueId]})
        },
    })
}