import { useParams } from "react-router-dom"
import { useGetIssue, useGetLabels } from "../hooks/issueQueryHooks"
import AddLabelSheet from "./AddLabelSheet"
import IssueActivity from "./IssueActivity"
import IssueComments from "./IssueComments"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"

export default function IssueDetail() {
    const { workspaceId, issueId } = useParams<{ workspaceId: string; issueId: string }>()
    const { data: issue, isPending: issuePending } = useGetIssue(workspaceId!, issueId!)
    const { data: labels, isPending: labelsPending } = useGetLabels(workspaceId!, issueId!)

    return (
        <div className="flex h-full min-h-0 flex-col gap-4">
            <div className="flex flex-col gap-1 text-left">
                {issuePending ? (
                    <Skeleton className="h-7 w-64" />
                ) : (
                    <h3 className="text-xl font-semibold text-foreground">{issue?.title}</h3>
                )}
                {issuePending ? (
                    <Skeleton className="h-4 w-full max-w-md" />
                ) : (
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {issue?.description || "No description"}
                    </p>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-1">
                {labelsPending && (
                    <>
                        <Skeleton className="h-5 w-14" />
                        <Skeleton className="h-5 w-16" />
                    </>
                )}
                {!labelsPending && labels?.length === 0 && (
                    <p className="text-sm text-muted-foreground">No labels yet</p>
                )}
                {labels?.map((label) => (
                    <Badge key={label.id} variant="outline">{label.label}</Badge>
                ))}
                <AddLabelSheet
                    workspaceId={workspaceId!}
                    issueId={issueId!}
                    sprintId={issue?.sprintId ?? undefined}
                />
            </div>

            <div className="flex min-h-0 flex-1 gap-4">
                <IssueActivity workspaceId={workspaceId!} issueId={issueId!} />

                <Separator orientation="vertical" />

                <IssueComments workspaceId={workspaceId!} issueId={issueId!} />
            </div>
        </div>
    )
}
