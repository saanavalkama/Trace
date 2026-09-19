import { formatDistanceToNow } from "date-fns"
import { activityIcon, activitySummary, actorLabel, describeActivity } from "../utils"
import type { IssueActivityProjection } from "@/types/types"

interface ActivityCardProps {
    entry: IssueActivityProjection
}

export default function ActivityCard({ entry }: ActivityCardProps) {
    const Icon = activityIcon(entry.eventType)

    return (
        <div className="flex items-center gap-3 rounded-lg bg-card p-2 text-sm text-card-foreground">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Icon className="size-4" />
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="font-semibold text-card-foreground">{activitySummary(entry.eventType)}</p>
                <p className="text-muted-foreground">
                    <span className="text-card-foreground">{actorLabel(entry.actor)}</span>{" "}
                    {describeActivity(entry)}
                </p>
            </div>

            <span className="shrink-0 text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
            </span>
        </div>
    )
}
