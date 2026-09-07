import { Loader2, UserMinus, UserPlus } from "lucide-react"
import { useGetIssue } from "../hooks/issueQueryHooks"
import { useAssign, useUnassingn } from "../hooks/issueMutationHooks"
import { useGetMembers } from "@/features/workspaces/hooks/workspaceQueryHooks"
import { useMe } from "@/features/auth/hooks/queries/authQueryHooks"
import AssigneeAvatars from "./AssigneeAvatars"
import AssignMemberSheet from "./AssignMemberSheet"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { WorkspaceMember } from "@/types/types"

interface AssigneeSectionProps {
    workspaceId: string
    issueId: string
}

export default function AssigneeSection({ workspaceId, issueId }: AssigneeSectionProps) {
    const { data: issue, isPending: issuePending } = useGetIssue(workspaceId, issueId)
    const { data: members, isPending: membersPending } = useGetMembers(workspaceId)
    const { data: me, isPending: mePending } = useMe()
    const { mutate: assign, isPending: assignPending } = useAssign()
    const { mutate: unassign, isPending: unassignPending } = useUnassingn()

    const isPending = issuePending || membersPending
    const assigneeIds = issue?.assignees ?? []
    const assignees = assigneeIds
        .map((userId) => members?.find((member) => member.userId === userId))
        .filter((member): member is WorkspaceMember => member !== undefined)

    const isAssignedToMe = !!me && assigneeIds.includes(me.id)
    const myMembership = !!me && members?.find((member) => member.userId === me.id)
    const canAssignOthers = myMembership && (myMembership.role === "admin" || myMembership.role === "owner")
    const myAssignPending = assignPending || unassignPending

    function handleAssignMyself() {
        if (!me) return
        assign({ workspaceId, issueId, userId: me.id })
    }

    function handleUnassignMyself() {
        if (!me) return
        unassign({ workspaceId, issueId, userId: me.id })
    }

    return (
        <TooltipProvider>
            <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-foreground">Assignees</h3>
                <div className="flex flex-wrap items-center gap-2">
                    <AssigneeAvatars assignees={assignees} isPending={isPending} />

                    {!isPending && (
                        isAssignedToMe ? (
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={mePending || myAssignPending}
                                onClick={handleUnassignMyself}
                            >
                                {unassignPending ? <Loader2 className="animate-spin" /> : <UserMinus />}
                                Unassign myself
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={mePending || myAssignPending}
                                onClick={handleAssignMyself}
                            >
                                {assignPending ? <Loader2 className="animate-spin" /> : <UserPlus />}
                                Assign myself
                            </Button>
                        )
                    )}

                    {!isPending && canAssignOthers && (
                        <AssignMemberSheet workspaceId={workspaceId} issueId={issueId} />
                    )}
                </div>
            </div>
        </TooltipProvider>
    )
}
