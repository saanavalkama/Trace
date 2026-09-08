import { useGetComments } from "../hooks/issueQueryHooks"
import CommentBox from "./CommentBox"
import CommentInput from "./CommentInput"

interface IssueCommentsProps {
    workspaceId: string
    issueId: string
}

export default function IssueComments({ workspaceId, issueId }: IssueCommentsProps) {
    const { data: comments, isPending, isError } = useGetComments(workspaceId, issueId)

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
            <h3 className="text-sm font-medium text-foreground">Comments</h3>
            <CommentBox comments={comments} isPending={isPending} isError={isError} />
            <CommentInput workspaceId={workspaceId} issueId={issueId} />
        </div>
    )
}
