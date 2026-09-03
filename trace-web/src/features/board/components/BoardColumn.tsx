import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import BoardCard from "./BoardCard"
import type { BoardIssueResponse } from "@/types/types"

interface BoardColumnProps {
    status: BoardIssueResponse['status']
    title: string
    issues: BoardIssueResponse[]
}

export default function BoardColumn({ status, title, issues }: BoardColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: status })

    return (
        <div className="flex h-full min-h-0 min-w-56 flex-1 basis-0 flex-col gap-3">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-medium text-foreground">{title}</h3>
                <span className="text-xs text-muted-foreground">{issues.length}</span>
            </div>
            <div
                ref={setNodeRef}
                className={cn(
                    "flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-xl border border-dashed border-border bg-muted/30 p-2 transition-colors",
                    isOver && "border-ring bg-accent"
                )}
            >
                {issues.map((issue) => (
                    <BoardCard key={issue.issueId} issue={issue} disabled={status === 'closed'} />
                ))}
                {issues.length === 0 && (
                    <p className="px-1 py-6 text-center text-xs text-muted-foreground">No issues</p>
                )}
            </div>
        </div>
    )
}
