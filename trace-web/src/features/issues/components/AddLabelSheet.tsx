import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Plus } from "lucide-react"
import { useAddLabel } from "../hooks/issueMutationHooks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

const addLabelSchema = z.object({
    label: z.string().min(1, "Label is required").max(50, "Label must be at most 50 characters"),
})

type AddLabelFormValues = z.infer<typeof addLabelSchema>

interface AddLabelSheetProps {
    workspaceId: string
    issueId: string
    sprintId?: string
}

export default function AddLabelSheet({ workspaceId, issueId, sprintId }: AddLabelSheetProps) {
    const [open, setOpen] = useState(false)
    const { mutate, isPending, isError } = useAddLabel()

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<AddLabelFormValues>({
        resolver: zodResolver(addLabelSchema),
        defaultValues: { label: "" },
    })

    function handleOpenChange(nextOpen: boolean) {
        setOpen(nextOpen)
        if (!nextOpen) reset()
    }

    function onSubmit(values: AddLabelFormValues) {
        mutate(
            { workspaceId, issueId, sprintId, label: values.label },
            { onSuccess: () => handleOpenChange(false) }
        )
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                    <Plus />
                    Add Labels
                </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col">
                <form onSubmit={handleSubmit(onSubmit)} className="flex h-full flex-col">
                    <SheetHeader>
                        <SheetTitle>Add label</SheetTitle>
                        <SheetDescription>Add a label to help categorize this issue.</SheetDescription>
                    </SheetHeader>

                    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="label">Label</Label>
                            <Input id="label" placeholder="bug" {...register("label")} />
                            {errors.label && (
                                <p className="text-sm text-destructive">{errors.label.message}</p>
                            )}
                        </div>

                        {isError && (
                            <p className="text-sm text-destructive">
                                Something went wrong adding the label. Please try again.
                            </p>
                        )}
                    </div>

                    <SheetFooter>
                        <Button type="submit" className="w-full" disabled={isPending}>
                            {isPending && <Loader2 className="animate-spin" />}
                            {isPending ? "Adding..." : "Add label"}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    )
}
