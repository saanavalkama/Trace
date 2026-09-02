import { useQuery } from "@tanstack/react-query"
import { sprintServices } from "../api/sprintServices"

export const useGetSprints = (workspaceId:string) => {
    return useQuery({
        queryKey:['sprints',workspaceId],
        queryFn:()=>sprintServices.getSprintsByWorkspaceId(workspaceId),
        staleTime: 1000 * 60 * 5,
        enabled: !!workspaceId
    })
}