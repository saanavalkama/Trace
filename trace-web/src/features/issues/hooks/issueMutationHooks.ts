import type { AddCommentData, AddLabelData, AssignData, Comment, IssueLink, Label, LinkIssueData, MoveToSprintData, ReopenData, UnassignData } from "@/types/types"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { issueService } from "../api/issueService"
import { useMe } from "@/features/auth/hooks/queries/authQueryHooks"

export const useAddComment = ()=>{
    const qc = useQueryClient()
    const { data: me } = useMe()

    return useMutation({
        mutationFn:(data:AddCommentData) => issueService.addComment(data.workspaceId, data.issueId, data.body),

        // Fully self-contained, same idea as labels: everything the optimistic entry
        // needs (body, author, timestamp) is already known client-side — body from the
        // form, author from the current session, timestamp from the clock. Only the id
        // is a temp placeholder until the next natural refetch supplies the real one.
        onMutate: async ({ workspaceId, issueId, body }) => {
            const queryKey = ['comments', workspaceId, issueId]
            await qc.cancelQueries({ queryKey })
            const previous = qc.getQueryData<Comment[]>(queryKey)

            const optimisticComment: Comment = {
                id: `optimistic-${crypto.randomUUID()}`,
                issueId,
                body,
                actor: me ? { id: me.id, email: me.email } : null,
                createdAt: new Date().toISOString(),
            }
            qc.setQueryData<Comment[]>(queryKey, (comments) => [...(comments ?? []), optimisticComment])

            return { previous }
        },

        onError: (_err, { workspaceId, issueId }, context) => {
            if (context?.previous) qc.setQueryData(['comments', workspaceId, issueId], context.previous)
        },

        // Safe to invalidate immediately: getComments reads straight from the event log,
        // same as getLabels, so there's no projection/outbox lag to race against.
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

        // getLinks is still projection-backed (issueName/issueStatus live on the other
        // issue's board row, which state can never carry) — but the caller already knows
        // that issue's title/status from the search step, so we don't need to wait on
        // the projection to build a fully accurate entry. linkId is a temp key until the
        // next natural refetch supplies the real one.
        onMutate: async (data) => {
            const queryKey = ['links', data.workspaceId, data.issueId]
            await qc.cancelQueries({ queryKey })
            const previous = qc.getQueryData<IssueLink[]>(queryKey)

            qc.setQueryData<IssueLink[]>(queryKey, (links) => {
                if (links?.some((link) => link.issueName === data.linkedIssueName && link.linkType === data.linkType)) {
                    return links
                }
                const optimisticLink: IssueLink = {
                    linkId: `optimistic-${data.linkedIIssueId}`,
                    issueName: data.linkedIssueName,
                    issueStatus: data.linkedIssueStatus,
                    linkType: data.linkType,
                }
                return [...(links ?? []), optimisticLink]
            })

            return { previous }
        },

        onError: (_err, { workspaceId, issueId }, context) => {
            if (context?.previous) qc.setQueryData(['links', workspaceId, issueId], context.previous)
        },

        onSuccess:(_,{workspaceId, issueId}) => {
            qc.invalidateQueries({queryKey:['issue', workspaceId, issueId]})
            qc.invalidateQueries({queryKey:['issueActivity', workspaceId, issueId]})
            // links deliberately not invalidated here — it's already correct from the
            // optimistic update above, and getLinks is still projection-backed, so an
            // immediate refetch here would just race the outbox and briefly show the
            // link disappearing again. Normal staleTime expiry / refocus reconciles the
            // temp linkId with the real one whenever the projection has caught up.
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