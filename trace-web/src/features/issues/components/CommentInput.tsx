import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { useAddComment } from "../hooks/issueMutationHooks"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const addCommentSchema = z.object({
    body: z.string().min(1, "Comment can't be empty").max(5000, "Comment must be at most 5000 characters"),
})

type AddCommentFormValues = z.infer<typeof addCommentSchema>

interface CommentInputProps {
    workspaceId: string
    issueId: string
}

export default function CommentInput({ workspaceId, issueId }: CommentInputProps) {
    const { mutate, isPending, isError } = useAddComment()

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<AddCommentFormValues>({
        resolver: zodResolver(addCommentSchema),
        defaultValues: { body: "" },
    })

    function onSubmit(values: AddCommentFormValues) {
        mutate(
            { workspaceId, issueId, body: values.body },
            { onSuccess: () => reset() }
        )
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 min-h-0 flex-col gap-2">
            <Textarea
                placeholder="Write a comment..."
                className="flex-1 min-h-0 resize-none"
                {...register("body")}
            />
            {errors.body && (
                <p className="text-sm text-destructive">{errors.body.message}</p>
            )}
            {isError && (
                <p className="text-sm text-destructive">Failed to add comment. Please try again.</p>
            )}
            <Button type="submit" size="sm" className="self-end" disabled={isPending}>
                {isPending && <Loader2 className="animate-spin" />}
                {isPending ? "Posting..." : "Comment"}
            </Button>
        </form>
    )
}
