import { useParams, Link } from "react-router-dom"
import { PanelLeft, Plus } from "lucide-react"
import { useGetSprints } from "@/features/sprints/hooks/sprintQueryHooks"
import { Button } from "@/components/ui/button"

export default function WorkspaceOverview() {
    const { workspaceId } = useParams<{ workspaceId: string }>()
    // same query key SprintSidebar already fetches with — no extra request, just
    // reused cache, used here only to tell an empty workspace apart from one that
    // just doesn't have a sprint selected yet
    const { data: sprints, isPending } = useGetSprints(workspaceId!)

    const hasNoSprints = !isPending && sprints?.length === 0

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <PanelLeft className="size-6" />
            </span>

            {hasNoSprints ? (
                <>
                    <p className="text-sm font-medium text-foreground">No sprints yet</p>
                    <p className="max-w-xs text-sm text-muted-foreground">
                        Create your first sprint to start planning work for this workspace.
                    </p>
                    <Button asChild size="sm" className="mt-1">
                        <Link to={`/workspaces/${workspaceId}/sprints/create`}>
                            <Plus />
                            Create sprint
                        </Link>
                    </Button>
                </>
            ) : (
                <>
                    <p className="text-sm font-medium text-foreground">No sprint selected</p>
                    <p className="max-w-xs text-sm text-muted-foreground">
                        Click a sprint in the sidebar to view its board.
                    </p>
                </>
            )}
        </div>
    )
}
