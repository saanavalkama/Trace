import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Link, useParams } from "react-router-dom"
import { cn, initialsFromEmail } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { BoardIssueResponse } from "@/types/types"

interface BoardCardProps {
    issue: BoardIssueResponse
    disabled?: boolean
}

export default function BoardCard({ issue, disabled }: BoardCardProps) {
    const { workspaceId } = useParams<{ workspaceId: string }>()
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: issue.issueId,
        disabled,
    })

    return (
        <Link
            ref={setNodeRef}
            to={`/workspaces/${workspaceId}/issues/${issue.issueId}`}
            {...listeners}
            {...attributes}
            style={{ transform: CSS.Translate.toString(transform) }}
            className={cn(
                "flex flex-col gap-2 rounded-lg border border-border bg-card p-3 text-left text-sm text-card-foreground shadow-sm transition-colors touch-none hover:bg-muted",
                disabled ? "cursor-default opacity-70" : "cursor-grab active:cursor-grabbing",
                isDragging && "opacity-50"
            )}
        >
            <p className="font-medium leading-snug">{issue.title}</p>

            {issue.labels.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                    {issue.labels.map((label) => (
                        <Badge key={label} variant="outline">{label}</Badge>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-muted-foreground">No labels yet</p>
            )}

            {issue.assignees.length > 0 ? (
                <div className="flex -space-x-2">
                    {issue.assignees.map((assignee) => (
                        <Tooltip key={assignee.id}>
                            <TooltipTrigger asChild>
                                <span className="flex size-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">
                                    {initialsFromEmail(assignee.email)}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>{assignee.email}</TooltipContent>
                        </Tooltip>
                    ))}
                </div>
            ) : (
                <p className="text-xs text-muted-foreground">No assignees yet</p>
            )}
        </Link>
    )
}
