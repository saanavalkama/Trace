import { Info, Settings } from "lucide-react"
import { Link } from "react-router-dom"
import { useMyWorkspaces } from "../hooks/workspaceQueryHooks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default function WorkspaceList(){
    const {data:workspaces,isPending, isError} = useMyWorkspaces()

    return(
        <TooltipProvider>
            {/* Unlike routes nested under WorkspaceLayout (which gets bg-background for
                free from SidebarInset), this is a standalone route with nothing above it
                applying a background — without this it sits on the raw page background,
                which (unlike the shadcn tokens) does react to OS dark-mode preference,
                making text-foreground unreadable against it. */}
            <div className="min-h-svh w-full bg-background">
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-6">
                    <div className="flex items-center justify-between gap-2">
                        <h2 className="text-xl font-semibold text-foreground">Your workspaces</h2>
                        <Button asChild size="sm">
                            <Link to="/workspaces/create">+ Add Workspace</Link>
                        </Button>
                    </div>

                    <div className="flex flex-col gap-2">
                        {isPending && (
                            <>
                                <Skeleton className="h-14 w-full" />
                                <Skeleton className="h-14 w-full" />
                            </>
                        )}

                        {isError && (
                            <p className="text-sm text-destructive">Something went wrong loading your workspaces.</p>
                        )}

                        {!isPending && !isError && workspaces?.length === 0 && (
                            <p className="text-sm text-muted-foreground">You're not a member of any workspace yet.</p>
                        )}

                        {workspaces?.map((workspace) => {
                            const canManage = workspace.role === "admin" || workspace.role === "owner"

                            return (
                                <div
                                    key={workspace.id}
                                    className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-card-foreground"
                                >
                                    <Link
                                        to={`/workspaces/${workspace.id}`}
                                        className="flex min-w-0 flex-1 items-center gap-2"
                                    >
                                        <span className="truncate text-sm font-medium">
                                            {workspace.name}
                                        </span>
                                        <Badge variant="secondary" className="capitalize">
                                            {workspace.role}
                                        </Badge>
                                    </Link>

                                    <div className="flex shrink-0 items-center gap-1">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button asChild variant="ghost" size="icon-sm">
                                                    <Link to={`/workspaces/${workspace.id}/info`} aria-label="View workspace">
                                                        <Info />
                                                    </Link>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>View workspace</TooltipContent>
                                        </Tooltip>

                                        {canManage && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button asChild variant="ghost" size="icon-sm">
                                                        <Link
                                                            to={`/workspaces/${workspace.id}/settings`}
                                                            aria-label="Workspace settings"
                                                        >
                                                            <Settings />
                                                        </Link>
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Workspace settings</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </TooltipProvider>
    )
}
