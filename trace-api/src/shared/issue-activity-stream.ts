import { publishToStream, consumeStream } from "./redis-stream"

const STREAM_KEY = "issue-activity-updates"
const MAX_STREAM_LENGTH = 10000

export interface IssueActivityUpdateMessage {
    workspaceId: string
    issueId: string
}

export async function publishIssueActivityUpdate(message: IssueActivityUpdateMessage) {
    await publishToStream(STREAM_KEY, MAX_STREAM_LENGTH, {
        workspaceId: message.workspaceId,
        issueId: message.issueId
    })
}

export async function consumeIssueActivityUpdates(
    consumerName: string,
    onMessage: (message: IssueActivityUpdateMessage) => void,
    isStopped: () => boolean
) {
    await consumeStream(STREAM_KEY, "issue-activity-relay", consumerName, (fields) => {
        onMessage({
            workspaceId: fields.workspaceId ?? "",
            issueId: fields.issueId ?? ""
        })
    }, isStopped)
}
