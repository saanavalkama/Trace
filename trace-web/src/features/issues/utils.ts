import type { ActorSummary, IssueActivityProjection } from "@/types/types"

export function actorLabel(actor: ActorSummary | null) {
    return actor?.email ?? "Unknown"
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
        case "Linked":
            return `linked this issue (${p.linkType})`
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
