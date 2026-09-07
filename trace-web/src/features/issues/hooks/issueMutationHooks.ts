import type { AddCommentData, AddLabelData, AssignData } from "@/types/types"
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

export const useAssign = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn:(data:AssignData)=>issueService.assign(data.workspaceId, data.issueId, data.userId),
        onSuccess:(_,{workspaceId, issueId})=>{
            qc.invalidateQueries({queryKey:['issue', workspaceId, issueId]})
            qc.invalidateQueries({queryKey:['issueActivity', workspaceId, issueId]})
        }
    })
}