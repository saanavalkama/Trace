import { useQuery } from "@tanstack/react-query"
import { workspaceService } from "../api/workspaceService"

export const useMyWorkspaces = () =>{
    return useQuery({
        queryKey:['workspaces'],
        queryFn: () => workspaceService.getWorkspaces(),
        staleTime:5 * 60 * 1000
    })
}

export const useGetMembers = (workspaceId:string) => {
    return useQuery({
        queryKey:['members', workspaceId],
        queryFn:()=>workspaceService.getMembers(workspaceId),
        staleTime: 5 * 60 * 1000,
        enabled: !!workspaceId
    })
}