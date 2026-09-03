import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { useCreateIssue } from "../hooks/boardMutationHooks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"

const createIssueSchema = z.object({
    title: z.string().min(1, "Title is required").max(200, "Title must be at most 200 characters"),
    description: z.string().max(5000, "Description must be at most 5000 characters"),
})

type CreateIssueFormValues = z.infer<typeof createIssueSchema>

export default function CreateIssueForm() {
    const { workspaceId, sprintId } = useParams<{ workspaceId: string; sprintId: string }>()
    const navigate = useNavigate()
    const { mutate, isPending, isError } = useCreateIssue()

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<CreateIssueFormValues>({
        resolver: zodResolver(createIssueSchema),
        defaultValues: { title: "", description: "" },
    })

    function close() {
        navigate(`/workspaces/${workspaceId}/sprints/${sprintId}`)
    }

    function onSubmit(values: CreateIssueFormValues) {
        mutate(
            {
                workspaceId: workspaceId!,
                sprintId: sprintId!,
                title: values.title,
                description: values.description,
            },
            { onSuccess: close }
        )
    }

    return (
        <Sheet open onOpenChange={(open) => !open && close()}>
            <SheetContent className="flex flex-col">
                <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
                    <SheetHeader>
                        <SheetTitle>Add issue</SheetTitle>
                        <SheetDescription>Create a new issue in this sprint.</SheetDescription>
                    </SheetHeader>

                    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" placeholder="Issue title" {...register("title")} />
                            {errors.title && (
                                <p className="text-sm text-destructive">{errors.title.message}</p>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                placeholder="Add more detail (optional)"
                                rows={6}
                                {...register("description")}
                            />
                            {errors.description && (
                                <p className="text-sm text-destructive">{errors.description.message}</p>
                            )}
                        </div>

                        {isError && (
                            <p className="text-sm text-destructive">
                                Something went wrong creating the issue. Please try again.
                            </p>
                        )}
                    </div>

                    <SheetFooter>
                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending && <Loader2 className="animate-spin" />}
                            {isPending ? "Creating issue..." : "Create issue"}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    )
}
