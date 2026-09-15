import type Redis from "ioredis"
import { redis, createBlockingRedisConnection } from "./redis"

const DEFAULT_BLOCK_MS = 5000
const DEFAULT_READ_COUNT = 50

export async function publishToStream(streamKey: string, maxLength: number, fields: Record<string, string>) {
    const args = Object.entries(fields).flat()
    await redis.xadd(streamKey, "MAXLEN", "~", maxLength, "*", ...args)
}

//creates consumer group, swallows error if group already up, otherwise throws
async function ensureConsumerGroup(client: Redis, streamKey: string, groupName: string) {
    try {
        await client.xgroup("CREATE", streamKey, groupName, "$", "MKSTREAM")
    } catch (err) {
        if (err instanceof Error && err.message.includes("BUSYGROUP")) return
        throw err
    }
}

//[key, value, key, value...]
function parseFields(fields: string[]): Record<string, string> {
    const record: Record<string, string> = {}
    for (let i = 0; i < fields.length; i += 2) {
        record[fields[i]] = fields[i + 1]
    }
    return record
}

type XReadGroupResponse = [string, [string, string[]][]] | null

// One consumer group per running instance (consumerName should be stable for the
// process's lifetime, e.g. a random id generated at boot) reading from '$' — every
// instance sees every message (broadcast, since any instance might hold the relevant
// client's socket), not partitioned like a typical shared consumer group would be.
export async function consumeStream(
    streamKey: string,
    groupPrefix: string,
    consumerName: string,
    onMessage: (fields: Record<string, string>) => void, //dependency injection via callback
    isStopped: () => boolean,
    options?: { blockMs?: number, readCount?: number }
) {
    const groupName = `${groupPrefix}:${consumerName}`
    const blockMs = options?.blockMs ?? DEFAULT_BLOCK_MS
    const readCount = options?.readCount ?? DEFAULT_READ_COUNT

    // Dedicated connection: this loop spends most of its time blocked in XREADGROUP,
    // which would otherwise stall any XADD/XACK issued on the same connection by
    // something else (e.g. the publisher) for up to blockMs.
    const connection = createBlockingRedisConnection()

    try {
        await ensureConsumerGroup(connection, streamKey, groupName)

        while (!isStopped()) {
            let response: XReadGroupResponse
            try {
                response = (await connection.call(
                    "XREADGROUP",
                    "GROUP", groupName, consumerName,
                    "BLOCK", blockMs,
                    "COUNT", readCount,
                    "STREAMS", streamKey, ">"
                )) as XReadGroupResponse
            } catch (err) {
                console.error(`Stream consumer read failed for ${streamKey}`, err)
                continue
            }
            if (!response) continue

            const [, entries] = response
            for (const [id, fields] of entries) {
                try {
                    onMessage(parseFields(fields))
                } catch (err) {
                    console.error(`Stream update handler failed for entry ${id} on ${streamKey}`, err)
                }
                await connection.xack(streamKey, groupName, id)
            }
        }
    } finally {
        connection.disconnect()
    }
}
