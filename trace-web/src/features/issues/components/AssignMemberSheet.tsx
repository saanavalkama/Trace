import { useState } from "react"
import { Loader2, Users, X } from "lucide-react"
import { useGetIssue } from "../hooks/issueQueryHooks"
import { useAssign, useUnassingn } from "../hooks/issueMutationHooks"
import { useGetMembers } from "@/features/workspaces/hooks/workspaceQueryHooks"
import { initialsFromEmail } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import AssigneeAvatars from "./AssigneeAvatars"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import type { WorkspaceMember } from "@/types/types"

interface AssignMemberSheetProps {
    workspaceId: string
    issueId: string
}

export default function AssignMemberSheet({ workspaceId, issueId }: AssignMemberSheetProps) {
    const [open, setOpen] = useState(false)
    const { data: issue } = useGetIssue(workspaceId, issueId)
    const { data: members } = useGetMembers(workspaceId)
    const { mutate: assign, isPending: assignPending, variables: assignVariables } = useAssign()
    const { mutate: unassign, isPending: unassignPending, variables: unassignVariables } = useUnassingn()

    const assigneeIds = issue?.assignees ?? []
    const assignees = assigneeIds
        .map((userId) => members?.find((member) => member.userId === userId))
        .filter((member): member is WorkspaceMember => member !== undefined)

    function handleAssignMember(userId: string) {
        assign({ workspaceId, issueId, userId })
    }

    function handleUnassignMember(userId: string) {
        unassign({ workspaceId, issueId, userId })
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                    <Users />
                    Assign to your team member
                </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col">
                <SheetHeader>
                    <SheetTitle>Assign to your team member</SheetTitle>
                    <SheetDescription>
                        Choose a member of your workspace to assign this issue to.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
                    <AssigneeAvatars assignees={assignees} />

                    <div className="flex flex-col gap-2">
                        {members?.map((member) => {
                            const alreadyAssigned = assigneeIds.includes(member.userId)
                            const isAssigningThis = assignPending && assignVariables?.userId === member.userId
                            const isUnassigningThis =
                                unassignPending && unassignVariables?.userId === member.userId

                            return (
                                <div
                                    key={member.id}
                                    className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                                >
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                                            {initialsFromEmail(member.user.email)}
                                        </span>
                                        <span className="break-all text-sm text-foreground">
                                            {member.user.email}
                                        </span>
                                    </div>

                                    {alreadyAssigned ? (
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            className="shrink-0"
                                            disabled={isUnassigningThis}
                                            onClick={() => handleUnassignMember(member.userId)}
                                            aria-label="Unassign"
                                        >
                                            {isUnassigningThis ? <Loader2 className="animate-spin" /> : <X />}
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="shrink-0"
                                            disabled={isAssigningThis}
                                            onClick={() => handleAssignMember(member.userId)}
                                        >
                                            {isAssigningThis && <Loader2 className="animate-spin" />}
                                            {isAssigningThis ? "Assigning..." : "Assign"}
                                        </Button>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
