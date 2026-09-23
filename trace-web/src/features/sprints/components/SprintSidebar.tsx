import { Link, NavLink, useParams } from "react-router-dom"
import { Plus } from "lucide-react"
import { useGetSprints } from "../hooks/sprintQueryHooks"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSkeleton,
    SidebarRail,
} from "@/components/ui/sidebar"

export default function SprintSidebar(){
    const { workspaceId, sprintId } = useParams<{ workspaceId: string; sprintId?: string }>()
    const { data: sprints, isPending, isError } = useGetSprints(workspaceId!)

    return (
        // The sidebar's fixed positioning defaults to spanning the whole
        // viewport (top-0 to bottom-0), which ignores DOM nesting entirely —
        // without this override it renders behind/over the navbar in
        // ProtectedRoute rather than below it.
        <Sidebar className="top-14 bottom-0">
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Sprints</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {isPending && Array.from({ length: 3 }).map((_, i) => (
                                <SidebarMenuItem key={i}>
                                    <SidebarMenuSkeleton />
                                </SidebarMenuItem>
                            ))}
                            {isError && (
                                <SidebarMenuItem>
                                    <p className="px-2 text-sm text-destructive">Failed to load sprints</p>
                                </SidebarMenuItem>
                            )}
                            {sprints?.map((sprint) => (
                                <SidebarMenuItem key={sprint.id}>
                                    <SidebarMenuButton asChild isActive={sprint.id === sprintId}>
                                        <NavLink to={`/workspaces/${workspaceId}/sprints/${sprint.id}`}>
                                            {sprint.name}
                                        </NavLink>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <Link to={`/workspaces/${workspaceId}/sprints/create`}>
                                <Plus />
                                <span>Add sprint</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
