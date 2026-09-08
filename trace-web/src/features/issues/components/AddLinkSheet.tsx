import { useEffect, useState, type FormEvent } from "react"
import { Link2, Loader2 } from "lucide-react"
import { useSearchIssues } from "../hooks/issueQueryHooks"
import { useLinkIssue } from "../hooks/issueMutationHooks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import type { LinkIssueData } from "@/types/types"

interface AddLinkSheetProps {
    workspaceId: string
    issueId: string
}

const linkTypeLabels: Record<LinkIssueData["linkType"], string> = {
    blocks: "Blocks",
    blocked_by: "Blocked by",
    relates_to: "Relates to",
    duplicates: "Duplicates",
}

const SEARCH_DEBOUNCE_MS = 300

export default function AddLinkSheet({ workspaceId, issueId }: AddLinkSheetProps) {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [debouncedQuery, setDebouncedQuery] = useState("")
    const [linkedIssueId, setLinkedIssueId] = useState("")
    const [linkType, setLinkType] = useState<LinkIssueData["linkType"]>("relates_to")

    useEffect(() => {
        const timeout = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS)
        return () => clearTimeout(timeout)
    }, [query])

    const { data: issues, isFetching } = useSearchIssues(workspaceId, debouncedQuery || undefined)
    const { mutate, isPending, isError } = useLinkIssue()

    const options = (issues ?? []).filter((issue) => issue.issueId !== issueId)

    function handleOpenChange(nextOpen: boolean) {
        setOpen(nextOpen)
        if (!nextOpen) {
            setQuery("")
            setDebouncedQuery("")
            setLinkedIssueId("")
            setLinkType("relates_to")
        }
    }

    function handleSubmit(e: FormEvent) {
        e.preventDefault()
        if (!linkedIssueId) return

        mutate(
            { workspaceId, issueId, linkedIIssueId: linkedIssueId, linkType },
            { onSuccess: () => handleOpenChange(false) }
        )
    }

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                    <Link2 />
                    Add Links
                </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col">
                <form onSubmit={handleSubmit} className="flex h-full flex-col">
                    <SheetHeader>
                        <SheetTitle>Add link</SheetTitle>
                        <SheetDescription>Link this issue to another issue in the workspace.</SheetDescription>
                    </SheetHeader>

                    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="issue-search">Search issues</Label>
                            <Input
                                id="issue-search"
                                placeholder="Search by title"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="issue-select">Issue</Label>
                            <Select value={linkedIssueId} onValueChange={setLinkedIssueId}>
                                <SelectTrigger id="issue-select" className="w-full">
                                    <SelectValue placeholder={isFetching ? "Searching..." : "Select an issue"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {options.length === 0 && (
                                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                            {isFetching ? "Searching..." : "No issues found"}
                                        </div>
                                    )}
                                    {options.map((issue) => (
                                        <SelectItem key={issue.issueId} value={issue.issueId}>
                                            {issue.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Label htmlFor="link-type-select">Link type</Label>
                            <Select
                                value={linkType}
                                onValueChange={(value) => setLinkType(value as LinkIssueData["linkType"])}
                            >
                                <SelectTrigger id="link-type-select" className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(linkTypeLabels).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {isError && (
                            <p className="text-sm text-destructive">
                                Something went wrong linking the issue. Please try again.
                            </p>
                        )}
                    </div>

                    <SheetFooter>
                        <Button type="submit" className="w-full" disabled={!linkedIssueId || isPending}>
                            {isPending && <Loader2 className="animate-spin" />}
                            {isPending ? "Linking..." : "Add link"}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    )
}
