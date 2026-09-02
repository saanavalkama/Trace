import { useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    closestCorners,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragStartEvent,
} from "@dnd-kit/core"
import { useBoard } from "../hooks/boardQueryHooks"
import { useMoveIssue } from "../hooks/boardMutationHooks"
import BoardColumn from "./BoardColumn"
import BoardCard from "./BoardCard"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { BoardIssueResponse } from "@/types/types"

const COLUMNS: { status: BoardIssueResponse['status']; title: string }[] = [
    { status: 'open', title: 'Open' },
    { status: 'in_progress', title: 'In Progress' },
    { status: 'in_review', title: 'In Review' },
    { status: 'closed', title: 'Closed' },
]

export default function BoardView() {
    const { workspaceId, sprintId } = useParams<{ workspaceId: string; sprintId: string }>()
    const { data: issues, isPending, isError } = useBoard(workspaceId!, sprintId!)
    const moveIssue = useMoveIssue(workspaceId!, sprintId!)
    const [activeIssue, setActiveIssue] = useState<BoardIssueResponse | null>(null)

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

    const issuesByStatus = useMemo(() => {
        const grouped = new Map<BoardIssueResponse['status'], BoardIssueResponse[]>(
            COLUMNS.map((column) => [column.status, []])
        )
        issues?.forEach((issue) => grouped.get(issue.status)?.push(issue))
        return grouped
    }, [issues])

    function handleDragStart(event: DragStartEvent) {
        setActiveIssue(issues?.find((issue) => issue.issueId === event.active.id) ?? null)
    }

    function handleDragEnd(event: DragEndEvent) {
        setActiveIssue(null)
        const { active, over } = event
        if (!over) return

        const targetStatus = over.id as BoardIssueResponse['status']
        const issue = issues?.find((i) => i.issueId === active.id)
        if (!issue || issue.status === targetStatus) return

        moveIssue.mutate({ issueId: issue.issueId, to: targetStatus })
    }

    if (isPending) {
        return (
            <div className="flex h-full gap-4">
                {COLUMNS.map((column) => (
                    <div key={column.status} className="flex min-w-56 flex-1 basis-0 flex-col gap-2">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-24 w-full" />
                    </div>
                ))}
            </div>
        )
    }

    if (isError) {
        return <p className="text-sm text-destructive">Failed to load board</p>
    }

    return (
        <TooltipProvider>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex h-full min-h-0 flex-col gap-2">
                    <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
                        {COLUMNS.map((column) => (
                            <BoardColumn
                                key={column.status}
                                status={column.status}
                                title={column.title}
                                issues={issuesByStatus.get(column.status) ?? []}
                            />
                        ))}
                    </div>
                    {moveIssue.isError && (
                        <p className="text-sm text-destructive">Failed to move issue. Please try again.</p>
                    )}
                </div>
                <DragOverlay>
                    {activeIssue && <BoardCard issue={activeIssue} />}
                </DragOverlay>
            </DndContext>
        </TooltipProvider>
    )
}
