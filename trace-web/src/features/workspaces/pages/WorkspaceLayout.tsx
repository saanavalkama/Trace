import SprintSidebar from "@/features/sprints/components/SprintSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Outlet } from "react-router-dom";

export default function WorkspaceLayout() {
    return (
        <SidebarProvider className="h-svh w-screen ml-[calc(50%-50vw)] overflow-hidden">
            <SprintSidebar />
            <SidebarInset className="min-h-0">
                <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4">
                    <Outlet />
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
