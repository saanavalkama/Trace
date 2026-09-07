import { initialsFromEmail } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { WorkspaceMember } from "@/types/types"

interface AssigneeAvatarsProps {
    assignees: WorkspaceMember[]
    isPending?: boolean
}

export default function AssigneeAvatars({ assignees, isPending }: AssigneeAvatarsProps) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            {isPending && (
                <>
                    <Skeleton className="size-7 rounded-full" />
                    <Skeleton className="size-7 rounded-full" />
                </>
            )}
            {!isPending && assignees.length === 0 && (
                <p className="text-sm text-muted-foreground">No assignees yet</p>
            )}
            {assignees.map((member) => (
                <Tooltip key={member.id}>
                    <TooltipTrigger asChild>
                        <span className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium text-muted-foreground">
                            {initialsFromEmail(member.user.email)}
                        </span>
                    </TooltipTrigger>
                    <TooltipContent>{member.user.email}</TooltipContent>
                </Tooltip>
            ))}
        </div>
    )
}
