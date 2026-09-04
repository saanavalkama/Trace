import { formatDistanceToNow } from "date-fns"
import { useGetActivity } from "../hooks/issueQueryHooks"
import { actorLabel, describeActivity } from "../utils"
import { Skeleton } from "@/components/ui/skeleton"

interface IssueActivityProps {
    workspaceId: string
    issueId: string
}

export default function IssueActivity({ workspaceId, issueId }: IssueActivityProps) {
    const { data: activity, isPending, isError } = useGetActivity(workspaceId, issueId)

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
            <h3 className="text-sm font-medium text-foreground">Activity</h3>
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
                {activity?.map((entry) => (
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
