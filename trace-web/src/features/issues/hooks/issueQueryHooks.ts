import { useQuery } from "@tanstack/react-query"
import { issueService } from "../api/issueService"

export const useGetIssue = (workspaceId:string, issueId:string) => {
    return useQuery({
        queryKey:['issue', workspaceId, issueId],
        queryFn:()=>issueService.getById(workspaceId, issueId),
        staleTime: 60 * 1000,
        enabled: !!workspaceId && !!issueId
    })
}

export const useGetActivity = (workspaceId:string, issueId:string) => {
    return useQuery({
        queryKey:['issueActivity', workspaceId, issueId],
        queryFn:()=>issueService.getActivity(workspaceId, issueId),
        staleTime: 60 * 1000,
        enabled: !!workspaceId && !!issueId
    })
}

export const useGetComments = (workspaceId:string, issueId:string) => {
    return useQuery({
        queryKey:['comments', workspaceId, issueId],
        queryFn: ()=>issueService.getComments(workspaceId, issueId),
        staleTime: 60*1000,
        enabled: !!workspaceId && !!issueId
    })
}

export const useGetLabels = (workspaceId:string, issueId:string) => {
    return useQuery({
        queryKey:['labels', workspaceId, issueId],
        queryFn:()=>issueService.getLabels(workspaceId, issueId),
        staleTime: 60*1000,
        enabled: !!workspaceId && !!issueId
    })
}

export const useGetLinks = (workspaceId:string, issueId:string) => {
    return useQuery({
        queryKey:['links', workspaceId, issueId],
        queryFn:()=>issueService.getLinks(workspaceId, issueId),
        staleTime: 60*1000,
        enabled: !!workspaceId && !!issueId
    })
}

export const useSearchIssues = (workspaceId:string, query?:string) => {
    return useQuery({
        queryKey:['issues', workspaceId, query],
        queryFn:()=>issueService.search(workspaceId, query),
        staleTime: 60 * 1000,
        enabled: !!workspaceId
    })
}