import { useQuery } from "@tanstack/react-query"
import { boardServices } from "../api/boardServices"

export const useBoard = (workspaceId:string, sprintId:string) => {
    return useQuery({
        queryKey:['board',workspaceId, sprintId],
        queryFn:()=>boardServices.getBoardBySprint(workspaceId, sprintId),
        enabled:!!sprintId && !!workspaceId,
        staleTime: 30 * 1000
    })
}