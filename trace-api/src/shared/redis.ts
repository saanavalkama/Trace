import Redis from "ioredis"
import { env } from "../config/env"

function createRedisClient() {
    const client = new Redis({
        host: env.redisHost,
        port: env.redisPort,
        maxRetriesPerRequest: null
    })
    client.on("error", (err) => {
        console.error("Redis client error", err)
    })
    return client
}

export const redis = createRedisClient()

// A blocking command (XREADGROUP ... BLOCK, BLPOP, ...) ties up the entire connection
// at the Redis protocol level until it resolves — the server won't process any other
// command already queued on that same connection until the block ends. Any consumer
// loop that blocks must get its own dedicated connection, never share the connection
// used for regular commands (XADD, XACK, ...), or those commands will queue behind
// the block for up to its full timeout.
export function createBlockingRedisConnection() {
    return createRedisClient()
}
