import { Link, useParams } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { useGetStatusCounts } from "@/features/issues/hooks/issueQueryHooks"
import { useGetMembers, useMyWorkspaces } from "../hooks/workspaceQueryHooks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { IssueStatusCounts } from "@/types/types"

const STATUS_TILES: { key: keyof IssueStatusCounts; label: string }[] = [
    { key: "open", label: "Open" },
    { key: "in_progress", label: "In Progress" },
    { key: "in_review", label: "In Review" },
    { key: "closed", label: "Closed" },
]

export default function WorkspaceInfo() {
    const { workspaceId } = useParams<{ workspaceId: string }>()

    // already cached by WorkspaceList — reused here just to show the workspace's
    // name in the heading, no extra request
    const { data: workspaces } = useMyWorkspaces()
    const workspace = workspaces?.find((w) => w.id === workspaceId)

    const { data: counts, isPending: countsPending, isError: countsError } = useGetStatusCounts(workspaceId!)
    const { data: members, isPending: membersPending, isError: membersError } = useGetMembers(workspaceId!)

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-1">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="icon-sm">
                    <Link to="/workspaces" aria-label="Back to workspaces">
                        <ArrowLeft />
                    </Link>
                </Button>
                <h2 className="text-xl font-semibold text-foreground">
                    {workspace?.name ?? "Workspace info"}
                </h2>
            </div>

            <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-foreground">Issues by status</h3>

                {countsPending && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                )}

                {countsError && (
                    <p className="text-sm text-destructive">Failed to load issue counts.</p>
                )}

                {counts && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {STATUS_TILES.map((tile) => (
                            <div
                                key={tile.key}
                                className="flex flex-col gap-1 rounded-md border border-border bg-card px-3 py-2 text-card-foreground"
                            >
                                <span className="text-2xl font-semibold">{counts[tile.key]}</span>
                                <span className="text-xs text-muted-foreground">{tile.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-foreground">Members</h3>

                {membersPending && (
                    <div className="flex flex-col gap-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                )}

                {membersError && (
                    <p className="text-sm text-destructive">Failed to load members.</p>
                )}

                {!membersPending && !membersError && members?.length === 0 && (
                    <p className="text-sm text-muted-foreground">No members yet</p>
                )}

                <div className="flex flex-col gap-2">
                    {members?.map((member) => (
                        <div
                            key={member.id}
                            className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-card-foreground"
                        >
                            <span className="min-w-0 truncate text-sm">{member.user.email}</span>
                            <Badge variant="secondary" className="shrink-0 capitalize">
                                {member.role}
                            </Badge>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
