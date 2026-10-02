import { useMemo, useState } from "react"
import { Link, Outlet, useParams, useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
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
import { useBoardRealtimeUpdates } from "../hooks/useBoardRealtimeUpdates"
import { useMe } from "@/features/auth/hooks/queries/authQueryHooks"
import BoardColumn from "./BoardColumn"
import BoardCard from "./BoardCard"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { BoardIssueResponse } from "@/types/types"

const COLUMNS: { status: BoardIssueResponse['status']; title: string }[] = [
    { status: 'open', title: 'Open' },
    { status: 'in_progress', title: 'In Progress' },
    { status: 'in_review', title: 'In Review' },
    { status: 'closed', title: 'Closed' },
]

type BoardTab = 'team' | 'mine'

const TABS: { value: BoardTab; label: string }[] = [
    { value: 'team', label: 'Team' },
    { value: 'mine', label: 'My issues' },
]

export default function BoardView() {
    const { workspaceId, sprintId } = useParams<{ workspaceId: string; sprintId: string }>()
    const { data: issues, isPending, isError } = useBoard(workspaceId!, sprintId!)
    const moveIssue = useMoveIssue(workspaceId!, sprintId!)
    useBoardRealtimeUpdates(workspaceId!, sprintId!)
    const { data: me } = useMe()
    const [activeIssue, setActiveIssue] = useState<BoardIssueResponse | null>(null)

    // Tab lives in the URL so refreshes and shared links keep the same view
    const [searchParams, setSearchParams] = useSearchParams()
    const tab: BoardTab = searchParams.get('view') === 'mine' ? 'mine' : 'team'

    function selectTab(next: BoardTab) {
        setSearchParams((params) => {
            if (next === 'team') params.delete('view')
            else params.set('view', next)
            return params
        }, { replace: true })
    }

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

    const myIssues = useMemo(
        () => issues?.filter((issue) => !!me && issue.assignees.some((assignee) => assignee.id === me.id)) ?? [],
        [issues, me]
    )
    const visibleIssues = tab === 'mine' ? myIssues : issues

    const issuesByStatus = useMemo(() => {
        const grouped = new Map<BoardIssueResponse['status'], BoardIssueResponse[]>(
            COLUMNS.map((column) => [column.status, []])
        )
        visibleIssues?.forEach((issue) => grouped.get(issue.status)?.push(issue))
        return grouped
    }, [visibleIssues])

    const tabCounts: Record<BoardTab, number> = { team: issues?.length ?? 0, mine: myIssues.length }

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

    return (
        <div className="flex h-full min-h-0 flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <div role="tablist" aria-label="Board view" className="inline-flex rounded-md bg-muted p-1">
                    {TABS.map(({ value, label }) => (
                        <button
                            key={value}
                            type="button"
                            role="tab"
                            aria-selected={tab === value}
                            onClick={() => selectTab(value)}
                            className={cn(
                                "inline-flex items-center gap-1.5 rounded-sm px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                                tab === value && "bg-background text-foreground shadow-sm"
                            )}
                        >
                            {label}
                            {!isPending && (
                                <span className="text-xs tabular-nums text-muted-foreground">{tabCounts[value]}</span>
                            )}
                        </button>
                    ))}
                </div>
                <Button asChild size="sm">
                    <Link to={`/workspaces/${workspaceId}/sprints/${sprintId}/issues/create`}>
                        <Plus />
                        Add issue
                    </Link>
                </Button>
            </div>

            {isPending && (
                <div className="flex h-full gap-4">
                    {COLUMNS.map((column) => (
                        <div key={column.status} className="flex min-w-56 flex-1 basis-0 flex-col gap-2">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    ))}
                </div>
            )}

            {isError && <p className="text-sm text-destructive">Failed to load board</p>}

            {!isPending && !isError && (
                <TooltipProvider>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="flex min-h-0 flex-1 flex-col gap-2">
                            {tab === 'mine' && myIssues.length === 0 && (
                                <p className="text-sm text-muted-foreground">No issues assigned to you in this sprint.</p>
                            )}
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
            )}

            <Outlet />
        </div>
    )
}
