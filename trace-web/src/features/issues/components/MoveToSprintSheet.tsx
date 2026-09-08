import { useEffect, useState, type FormEvent } from "react"
import { CalendarClock, Loader2 } from "lucide-react"
import { useGetIssue } from "../hooks/issueQueryHooks"
import { useMoveToSprint } from "../hooks/issueMutationHooks"
import { useGetSprints } from "@/features/sprints/hooks/sprintQueryHooks"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"

interface MoveToSprintSheetProps {
    workspaceId: string
    issueId: string
}

export default function MoveToSprintSheet({ workspaceId, issueId }: MoveToSprintSheetProps) {
    const [open, setOpen] = useState(false)
    const [sprintId, setSprintId] = useState("")

    const { data: issue } = useGetIssue(workspaceId, issueId)
    const { data: sprints, isPending: sprintsPending } = useGetSprints(workspaceId)
    const { mutate, isPending, isError } = useMoveToSprint()

    useEffect(() => {
        if (open) setSprintId(issue?.sprintId ?? "")
    }, [open, issue?.sprintId])

    function handleOpenChange(nextOpen: boolean) {
        setOpen(nextOpen)
        if (!nextOpen) setSprintId("")
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault()
        if (!sprintId) return

        mutate(
            { workspaceId, issueId, sprintId, previousSprintId: issue?.sprintId },
            { onSuccess: () => handleOpenChange(false) }
        )
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                    <CalendarClock />
                    Move to sprint
                </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col">
                <form onSubmit={handleSubmit} className="flex h-full flex-col">
                    <SheetHeader>
                        <SheetTitle>Move to sprint</SheetTitle>
                        <SheetDescription>Choose which sprint this issue belongs to.</SheetDescription>
                    </SheetHeader>

                    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
                        <Select value={sprintId} onValueChange={setSprintId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={sprintsPending ? "Loading sprints..." : "Select a sprint"} />
                            </SelectTrigger>
                            <SelectContent>
                                {!sprintsPending && sprints?.length === 0 && (
                                    <div className="px-2 py-1.5 text-sm text-muted-foreground">No sprints yet</div>
                                )}
                                {sprints?.map((sprint) => (
                                    <SelectItem key={sprint.id} value={sprint.id}>
                                        {sprint.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {isError && (
                            <p className="text-sm text-destructive">
                                Something went wrong moving the issue. Please try again.
                            </p>
                        )}
                    </div>

                    <SheetFooter>
                        <Button type="submit" className="w-full" disabled={!sprintId || isPending}>
                            {isPending && <Loader2 className="animate-spin" />}
                            {isPending ? "Moving..." : "Move to sprint"}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    )
}
