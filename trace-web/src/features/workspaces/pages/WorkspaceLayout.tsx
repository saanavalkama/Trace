import SprintSidebar from "@/features/sprints/components/SprintSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";

export default function WorkspaceLayout() {
    // ProtectedRoute already breaks out of #root's width cap — no need to
    // repeat that here, this just fills the space it's given.
    return (
        <SidebarProvider className="h-full w-full overflow-hidden">
            <SprintSidebar />
            {/* min-w-0 on both: flex items default to min-width: auto, which
                refuses to shrink below content width — without it, a wide
                board just grows past the viewport and gets silently clipped
                by SidebarProvider's overflow-hidden instead of triggering
                BoardView's own overflow-x-auto. */}
            <SidebarInset className="min-h-0 min-w-0">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 px-4 pb-4">
                    <Outlet />
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
