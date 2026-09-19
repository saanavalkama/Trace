import {
    Activity as ActivityIcon,
    CalendarClock,
    CheckCircle2,
    FilePlus2,
    Link2,
    RefreshCw,
    RotateCcw,
    Tag,
    UserMinus,
    UserPlus,
    type LucideIcon,
} from "lucide-react"
import type { ActorSummary, IssueActivityProjection } from "@/types/types"

export function actorLabel(actor: ActorSummary | null) {
    return actor?.email ?? "Unknown"
}

export const ACTIVITY_TYPE_OPTIONS: { value: string; label: string }[] = [
    { value: "IssueCreated", label: "Created" },
    { value: "StatusChanged", label: "Status changed" },
    { value: "Assigned", label: "Assigned" },
    { value: "Unassigned", label: "Unassigned" },
    { value: "LabelAdded", label: "Label added" },
    { value: "Linked", label: "Linked" },
    { value: "Closed", label: "Closed" },
    { value: "Reopened", label: "Reopened" },
    { value: "MovedToSprint", label: "Moved to sprint" },
]

export function activitySummary(eventType: string): string {
    return ACTIVITY_TYPE_OPTIONS.find((option) => option.value === eventType)?.label ?? eventType
}

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
    IssueCreated: FilePlus2,
    StatusChanged: RefreshCw,
    Assigned: UserPlus,
    Unassigned: UserMinus,
    LabelAdded: Tag,
    Linked: Link2,
    Closed: CheckCircle2,
    Reopened: RotateCcw,
    MovedToSprint: CalendarClock,
}

export function activityIcon(eventType: string): LucideIcon {
    return ACTIVITY_ICONS[eventType] ?? ActivityIcon
}

export const LINK_TYPE_LABELS: Record<string, string> = {
    blocks: "Blocks",
    blocked_by: "Blocked by",
    relates_to: "Relates to",
    duplicates: "Duplicates",
}

export function describeActivity(entry: IssueActivityProjection): string {
    const p = entry.payload
    switch (entry.eventType) {
        case "IssueCreated":
            return "created this issue"
        case "StatusChanged":
            return `changed status from ${p.from} to ${p.to}`
        case "Assigned":
            return "assigned a member"
        case "Unassigned":
            return "unassigned a member"
        case "LabelAdded":
            return `added label "${p.label}"`
        case "Linked": {
            const linkType = LINK_TYPE_LABELS[p.linkType as string] ?? p.linkType
            return `linked this issue (${linkType})`
        }
        case "Closed":
            return p.reason ? `closed this issue: ${p.reason}` : "closed this issue"
        case "Reopened":
            return "reopened this issue"
        case "MovedToSprint":
            return "moved this issue to a different sprint"
        default:
            return entry.eventType
    }
}
