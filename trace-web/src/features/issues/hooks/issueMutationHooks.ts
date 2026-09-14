import type { AddCommentData, AddLabelData, AssignData, Label, LinkIssueData, MoveToSprintData, ReopenData, UnassignData } from "@/types/types"
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

        // id = label text, matching the backend's synthesis scheme (getLabels now reads
        // from state, where labels are just deduped strings) — so this optimistic entry
        // and the eventually-refetched real one share the same id, no key churn.
        onMutate: async ({ workspaceId, issueId, label }) => {
            const queryKey = ['labels', workspaceId, issueId]
            await qc.cancelQueries({ queryKey })
            const previous = qc.getQueryData<Label[]>(queryKey)

            qc.setQueryData<Label[]>(queryKey, (labels) =>
                labels?.some((existing) => existing.label === label)
                    ? labels
                    : [...(labels ?? []), { id: label, label }]
            )

            return { previous }
        },

        onError: (_err, { workspaceId, issueId }, context) => {
            if (context?.previous) qc.setQueryData(['labels', workspaceId, issueId], context.previous)
        },

        // Safe to invalidate immediately now: getLabels is state-based, not projection-
        // based, so there's no outbox lag left to race against.
        onSettled: (_data, _error, { workspaceId, issueId, sprintId }) => {
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

export const useUnassingn = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn:(data:UnassignData) => issueService.unassingn(data.workspaceId, data.issueId, data.userId),
        onSuccess:(_,{workspaceId, issueId}) => {
            qc.invalidateQueries({queryKey:['issue', workspaceId, issueId]})
            qc.invalidateQueries({queryKey:['issueActivity', workspaceId, issueId]})
        }
    })
}

export const useLinkIssue = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn:(data:LinkIssueData) => issueService.link(data.workspaceId, data.issueId, data.linkedIIssueId, data.linkType),
        onSuccess:(_,{workspaceId, issueId}) => {
            qc.invalidateQueries({queryKey:['issue', workspaceId, issueId]})
            qc.invalidateQueries({queryKey:['issueActivity', workspaceId, issueId]})
            qc.invalidateQueries({queryKey:['links', workspaceId, issueId]})
        }
    })
}

export const useMoveToSprint = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn:(data:MoveToSprintData) => issueService.moveToSprint(data.workspaceId, data.issueId, data.sprintId),
        onSuccess:(_,{workspaceId, issueId, sprintId, previousSprintId}) => {
            qc.invalidateQueries({queryKey:['issue', workspaceId, issueId]})
            qc.invalidateQueries({queryKey:['issueActivity', workspaceId, issueId]})
            qc.invalidateQueries({queryKey:['board', workspaceId, sprintId]})
            if(previousSprintId) qc.invalidateQueries({queryKey:['board', workspaceId, previousSprintId]})
        }
    })
}

export const useReopen = () => {
    const qc = useQueryClient()
    return useMutation({
        mutationFn:(data:ReopenData) => issueService.reopen(data.workspaceId, data.issueId),
        onSuccess:(_,{workspaceId, issueId, sprintId}) => {
            qc.invalidateQueries({queryKey:['issue', workspaceId, issueId]})
            qc.invalidateQueries({queryKey:['issueActivity', workspaceId, issueId]})
            if(sprintId) qc.invalidateQueries({queryKey:['board', workspaceId, sprintId]})
        }
    })
}