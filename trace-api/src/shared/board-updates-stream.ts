import { publishToStream, consumeStream } from "./redis-stream"

const STREAM_KEY = "board-updates"
const MAX_STREAM_LENGTH = 10000

export interface BoardUpdateMessage {
    workspaceId: string
    sprintId: string
    issueId: string
}

// sprintId is stored as '' rather than null — Redis stream fields are plain strings.
// An empty sprintId simply won't match any board subscription (subscribers always
// carry a real sprint id from the board URL), which is exactly the behavior we want
// for an issue that isn't on any sprint board right now.
export async function publishBoardUpdate(message: BoardUpdateMessage) {
    await publishToStream(STREAM_KEY, MAX_STREAM_LENGTH, {
        workspaceId: message.workspaceId,
        sprintId: message.sprintId,
        issueId: message.issueId
    })
}

export async function consumeBoardUpdates(
    consumerName: string,
    onMessage: (message: BoardUpdateMessage) => void,
    isStopped: () => boolean
) {
    await consumeStream(STREAM_KEY, "board-relay", consumerName, (fields) => {
        onMessage({
            workspaceId: fields.workspaceId ?? "",
            sprintId: fields.sprintId ?? "",
            issueId: fields.issueId ?? ""
        })
    }, isStopped)
}
