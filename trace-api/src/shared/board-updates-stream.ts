import type Redis from "ioredis"
import { redis, createBlockingRedisConnection } from "./redis"

const STREAM_KEY = "board-updates"
const MAX_STREAM_LENGTH = 10000
const BLOCK_MS = 5000
const READ_COUNT = 50

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
    await redis.xadd(
        STREAM_KEY, //add new entry to the board updates stream
        "MAXLEN", "~", MAX_STREAM_LENGTH, //trim stream to approximately 10,000 entries
        "*", //generate id
        "workspaceId", message.workspaceId,
        "sprintId", message.sprintId,
        "issueId", message.issueId
    )
}

//creates consumer group, swallows error if group already up, otherwise throws
async function ensureConsumerGroup(client: Redis, groupName: string) {
    try {
        await client.xgroup("CREATE", STREAM_KEY, groupName, "$", "MKSTREAM")
    } catch (err) {
        if (err instanceof Error && err.message.includes("BUSYGROUP")) return
        throw err
    }
}
//[key, value, key, value...]
function parseFields(fields: string[]): BoardUpdateMessage {
    const record: Record<string, string> = {}
    for (let i = 0; i < fields.length; i += 2) {
        record[fields[i]] = fields[i + 1]
    }
    return {
        workspaceId: record.workspaceId ?? "",
        sprintId: record.sprintId ?? "",
        issueId: record.issueId ?? ""
    }
}

type XReadGroupResponse = [string, [string, string[]][]] | null

// One consumer group per running instance (consumerName should be stable for the
// process's lifetime, e.g. a random id generated at boot) reading from '$' — every
// instance sees every message (broadcast, since any instance might hold the relevant
// client's socket), not partitioned like a typical shared consumer group would be.
export async function consumeBoardUpdates(
    consumerName: string,
    onMessage: (message: BoardUpdateMessage) => void, //dependecy injection via callback
    isStopped: () => boolean
) {
    const groupName = `board-relay:${consumerName}`
    // Dedicated connection: this loop spends most of its time blocked in XREADGROUP,
    // which would otherwise stall any XADD/XACK issued on the same connection by
    // something else (e.g. publishBoardUpdate) for up to BLOCK_MS.
    const connection = createBlockingRedisConnection()

    try {
        await ensureConsumerGroup(connection, groupName)

        while (!isStopped()) {
            let response: XReadGroupResponse
            try {
                response = (await connection.call(
                    "XREADGROUP",
                    "GROUP", groupName, consumerName,
                    "BLOCK", BLOCK_MS,
                    "COUNT", READ_COUNT,
                    "STREAMS", STREAM_KEY, ">"
                )) as XReadGroupResponse
            } catch (err) {
                console.error("Board updates consumer read failed", err)
                continue
            }
            if (!response) continue

            const [, entries] = response
            for (const [id, fields] of entries) {
                try {
                    onMessage(parseFields(fields))
                } catch (err) {
                    console.error(`Board update handler failed for entry ${id}`, err)
                }
                await connection.xack(STREAM_KEY, groupName, id)
            }
        }
    } finally {
        connection.disconnect()
    }
}
