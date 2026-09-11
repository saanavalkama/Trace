import "dotenv/config"
import crypto from "crypto"
import { redis, createBlockingRedisConnection } from "../src/shared/redis"

// Measures how a SINGLE Redis Streams consumer (matching the shape of the real
// consumeBoardUpdates loop: XREADGROUP with the same BLOCK/COUNT, XACK per message)
// holds up as N events are burst-published nearly simultaneously via a pipeline.
// Each run uses its own throwaway stream/group so runs never interfere with each
// other or with the real "board-updates" stream.

const BLOCK_MS = 5000
const READ_COUNT = 50
const RECEIVE_TIMEOUT_MS = 60_000

interface BenchResult {
    n: number
    publishMs: number
    totalWallMs: number
    throughputMsgPerSec: number
    minLatencyMs: number
    p50LatencyMs: number
    p95LatencyMs: number
    p99LatencyMs: number
    maxLatencyMs: number
    firstLatencyMs: number
    lastLatencyMs: number
    receivedCount: number
}

function percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0
    const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length))
    return sorted[idx]
}

async function runOnce(n: number): Promise<BenchResult> {
    const streamKey = `bench-stream:${crypto.randomUUID()}`
    const groupName = "bench-group"
    const consumerName = "bench-consumer"

    // Dedicated connection for the blocking consumer, separate from `redis` (used below
    // to publish). Sharing one connection between a blocking XREADGROUP and the publish
    // pipeline was the first bug this benchmark caught: the publish would queue behind
    // the consumer's in-flight block and appear to cost ~BLOCK_MS regardless of N.
    const consumerConnection = createBlockingRedisConnection()
    await consumerConnection.xgroup("CREATE", streamKey, groupName, "$", "MKSTREAM")

    const latencies: number[] = new Array(n).fill(-1)
    let received = 0
    let lastReceivedAt = 0
    let stopped = false

    const donePromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
            () => { stopped = true; reject(new Error(`timed out: received ${received}/${n}`)) },
            RECEIVE_TIMEOUT_MS
        )

        async function consumeLoop() {
            while (!stopped) {
                let response: [string, [string, string[]][]] | null
                try {
                    response = (await consumerConnection.call(
                        "XREADGROUP",
                        "GROUP", groupName, consumerName,
                        "BLOCK", BLOCK_MS,
                        "COUNT", READ_COUNT,
                        "STREAMS", streamKey, ">"
                    )) as [string, [string, string[]][]] | null
                } catch (err) {
                    console.error("consume error", err)
                    continue
                }
                if (!response) continue

                const [, entries] = response
                for (const [id, fields] of entries) {
                    const now = Date.now()
                    const record: Record<string, string> = {}
                    for (let i = 0; i < fields.length; i += 2) record[fields[i]] = fields[i + 1]
                    const seq = Number(record.seq)
                    const publishedAt = Number(record.publishedAt)
                    if (Number.isFinite(seq) && seq >= 0 && seq < n) {
                        latencies[seq] = now - publishedAt
                        received++
                        lastReceivedAt = now
                    }
                    await consumerConnection.xack(streamKey, groupName, id)
                }

                if (received >= n) {
                    stopped = true
                    clearTimeout(timeout)
                    resolve()
                }
            }
        }
        consumeLoop().catch(reject)
    })

    // let the consumer settle into its blocking read before the burst, so setup time
    // doesn't get counted as part of the first message's delivery latency
    await new Promise((r) => setTimeout(r, 100))

    const publishStart = Date.now()
    const pipeline = redis.pipeline()
    for (let i = 0; i < n; i++) {
        pipeline.xadd(streamKey, "*", "seq", String(i), "publishedAt", String(Date.now()))
    }
    await pipeline.exec()
    const publishMs = Date.now() - publishStart

    await donePromise

    const totalWallMs = Math.max(1, lastReceivedAt - publishStart)
    const definedLatencies = latencies.filter((l) => l >= 0)
    const sorted = [...definedLatencies].sort((a, b) => a - b)

    const result: BenchResult = {
        n,
        publishMs,
        totalWallMs,
        throughputMsgPerSec: definedLatencies.length / (totalWallMs / 1000),
        minLatencyMs: sorted[0] ?? 0,
        p50LatencyMs: percentile(sorted, 0.5),
        p95LatencyMs: percentile(sorted, 0.95),
        p99LatencyMs: percentile(sorted, 0.99),
        maxLatencyMs: sorted[sorted.length - 1] ?? 0,
        firstLatencyMs: latencies[0] ?? -1,
        lastLatencyMs: latencies[n - 1] ?? -1,
        receivedCount: definedLatencies.length
    }

    await redis.xgroup("DESTROY", streamKey, groupName).catch(() => {})
    await redis.del(streamKey)
    consumerConnection.disconnect()

    return result
}

async function main() {
    const arg = process.argv[2]
    const sizes = arg ? arg.split(",").map(Number) : [10, 100, 1000, 5000, 10000, 50000]

    console.log("Redis Streams single-consumer throughput benchmark")
    console.log(`sizes: ${sizes.join(", ")}\n`)

    const results: BenchResult[] = []
    for (const n of sizes) {
        process.stdout.write(`N=${n}... `)
        const result = await runOnce(n)
        results.push(result)
        console.log(
            `received ${result.receivedCount}/${n} | publish ${result.publishMs}ms | ` +
            `throughput ${result.throughputMsgPerSec.toFixed(0)} msg/s | ` +
            `latency p50/p95/p99/max ${result.p50LatencyMs}/${result.p95LatencyMs}/${result.p99LatencyMs}/${result.maxLatencyMs}ms | ` +
            `first->last ${result.firstLatencyMs}ms -> ${result.lastLatencyMs}ms`
        )
    }

    console.log("\nsummary (rising p99/max and a growing first->last gap as N increases is the single-consumer bottleneck signature):\n")
    console.log(`${"N".padEnd(8)}${"throughput".padEnd(13)}${"p50".padEnd(7)}${"p95".padEnd(7)}${"p99".padEnd(7)}${"max".padEnd(8)}first -> last`)
    for (const r of results) {
        console.log(
            `${String(r.n).padEnd(8)}${(r.throughputMsgPerSec.toFixed(0) + "/s").padEnd(13)}` +
            `${(r.p50LatencyMs + "ms").padEnd(7)}${(r.p95LatencyMs + "ms").padEnd(7)}${(r.p99LatencyMs + "ms").padEnd(7)}${(r.maxLatencyMs + "ms").padEnd(8)}` +
            `${r.firstLatencyMs}ms -> ${r.lastLatencyMs}ms`
        )
    }

    await redis.quit()
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
