import { formatDistanceToNow } from "date-fns"
import { Skeleton } from "@/components/ui/skeleton"
import { actorLabel } from "../utils"
import type { Comment } from "@/types/types"

interface CommentBoxProps {
    comments?: Comment[]
    isPending: boolean
    isError: boolean
}

export default function CommentBox({ comments, isPending, isError }: CommentBoxProps) {
    return (
        <div className="flex min-h-0 flex-[3] flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-muted/30 p-3">
            {isPending && (
                <>
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </>
            )}
            {isError && (
                <p className="text-sm text-destructive">Failed to load comments</p>
            )}
            {!isPending && !isError && comments?.length === 0 && (
                <p className="text-sm text-muted-foreground">No comments yet</p>
            )}
            {comments?.map((comment) => (
                <div key={comment.id} className="flex flex-col gap-1 rounded-lg bg-card p-2 text-sm text-card-foreground">
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{actorLabel(comment.actor)}</span>
                        <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </span>
                    </div>
                    <p className="whitespace-pre-wrap">{comment.body}</p>
                </div>
            ))}
        </div>
    )
}
