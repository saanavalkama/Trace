import { useQuery } from "@tanstack/react-query"
import { workspaceService } from "../api/workspaceService"

export const useMyWorkspaces = () =>{
    return useQuery({
        queryKey:['workspaces'],
        queryFn: () => workspaceService.getWorkspaces(),
        staleTime:5 * 60 * 1000
    })
}