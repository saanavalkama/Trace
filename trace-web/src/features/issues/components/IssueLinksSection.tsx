import { useGetLinks } from "../hooks/issueQueryHooks"
import AddLinkSheet from "./AddLinkSheet"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface IssueLinksSectionProps {
    workspaceId: string
    issueId: string
}

const linkTypeLabels: Record<string, string> = {
    blocks: "Blocks",
    blocked_by: "Blocked by",
    relates_to: "Relates to",
    duplicates: "Duplicates",
}

export default function IssueLinksSection({ workspaceId, issueId }: IssueLinksSectionProps) {
    const { data: links, isPending } = useGetLinks(workspaceId, issueId)

    return (
        <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-foreground">Linked issues</h3>
            <div className="flex flex-col gap-2">
                {isPending && (
                    <>
                        <Skeleton className="h-9 w-full" />
                        <Skeleton className="h-9 w-full" />
                    </>
                )}
                {!isPending && links?.length === 0 && (
                    <p className="text-sm text-muted-foreground">No linked issues yet</p>
                )}
                {links?.map((link) => (
                    <div
                        key={link.linkId}
                        className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                    >
                        <div className="flex min-w-0 items-center gap-2">
                            <Badge variant="outline" className="shrink-0">
                                {linkTypeLabels[link.linkType] ?? link.linkType}
                            </Badge>
                            <span className="truncate text-sm text-foreground">{link.issueName}</span>
                        </div>
                        <Badge variant="secondary" className="shrink-0">{link.issueStatus}</Badge>
                    </div>
                ))}

                {!isPending && (
                    <div>
                        <AddLinkSheet workspaceId={workspaceId} issueId={issueId} />
                    </div>
                )}
            </div>
        </div>
    )
}
