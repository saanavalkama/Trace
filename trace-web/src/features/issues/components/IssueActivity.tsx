import { useMemo, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { ArrowUpDown, X } from "lucide-react"
import { useGetActivity } from "../hooks/issueQueryHooks"
import { useIssueActivityRealtimeUpdates } from "../hooks/useIssueActivityRealtimeUpdates"
import { ACTIVITY_TYPE_OPTIONS, actorLabel, describeActivity } from "../utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface IssueActivityProps {
    workspaceId: string
    issueId: string
}

type SortOrder = "newest" | "oldest"

export default function IssueActivity({ workspaceId, issueId }: IssueActivityProps) {
    const { data: activity, isPending, isError } = useGetActivity(workspaceId, issueId)
    useIssueActivityRealtimeUpdates(workspaceId, issueId)

    const [sortOrder, setSortOrder] = useState<SortOrder>("newest")
    const [selectedTypes, setSelectedTypes] = useState<string[]>([])

    function toggleType(type: string) {
        setSelectedTypes((prev) =>
            prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
        )
    }

    // backend always returns oldest-first; reverse client-side for "newest first"
    const visibleActivity = useMemo(() => {
        if (!activity) return activity
        const filtered = selectedTypes.length === 0
            ? activity
            : activity.filter((entry) => selectedTypes.includes(entry.eventType))
        return sortOrder === "newest" ? [...filtered].reverse() : filtered
    }, [activity, selectedTypes, sortOrder])

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-foreground">Activity</h3>
                <div>
                    <Label htmlFor="activity-sort" className="sr-only">Sort activity</Label>
                    <Select value={sortOrder} onValueChange={(value) => setSortOrder(value as SortOrder)}>
                        <SelectTrigger id="activity-sort" size="sm" className="w-36">
                            <ArrowUpDown />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest first</SelectItem>
                            <SelectItem value="oldest">Oldest first</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-1">
                {ACTIVITY_TYPE_OPTIONS.map((option) => {
                    const active = selectedTypes.includes(option.value)
                    return (
                        <Badge key={option.value} asChild variant={active ? "default" : "outline"}>
                            <button
                                type="button"
                                aria-pressed={active}
                                onClick={() => toggleType(option.value)}
                            >
                                {option.label}
                            </button>
                        </Badge>
                    )
                })}
                {selectedTypes.length > 0 && (
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => setSelectedTypes([])}
                        aria-label="Clear filters"
                    >
                        <X />
                    </Button>
                )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-muted/30 p-3">
                {isPending && (
                    <>
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </>
                )}
                {isError && (
                    <p className="text-sm text-destructive">Failed to load activity</p>
                )}
                {!isPending && !isError && activity?.length === 0 && (
                    <p className="text-sm text-muted-foreground">No activity yet</p>
                )}
                {!isPending && !isError && !!activity?.length && visibleActivity?.length === 0 && (
                    <p className="text-sm text-muted-foreground">No activity matches the selected filters</p>
                )}
                {visibleActivity?.map((entry) => (
                    <div key={entry.id} className="flex flex-col gap-0.5 rounded-lg bg-card p-2 text-sm text-card-foreground">
                        <p>
                            <span className="font-medium">{actorLabel(entry.actor)}</span>{" "}
                            {describeActivity(entry)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}
