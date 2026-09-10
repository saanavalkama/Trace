import { prisma } from "../db/prisma"
import { projectIssueEvent } from "../features/issues/issue-projector"
import { StoredEvent } from "../features/issues/issue-events"

const MAX_ATTEMPTS = 5
const BASE_BACKOFF_MS = 1000
const MAX_BACKOFF_MS = 5 * 60 * 1000
const STALL_TIMEOUT_MS = 60 * 1000
const HEAD_SCAN_BATCH_SIZE = 50

// Per-issue FIFO, not global: projections are incremental (push/filter on arrays), so
// events for the same issue must apply strictly in order, but unrelated issues don't
// need to wait on each other. For every issue, only its oldest unresolved message (the
// "head") is ever eligible; later messages for that issue are never picked up while the
// head is still pending, processing, or backing off. If a head permanently fails
// (exhausts MAX_ATTEMPTS), that issue's queue stays blocked indefinitely rather than
// letting later events apply on top of a known-incomplete projection — everything else
// keeps moving. A blocked issue shows up as a 'failed' row and needs manual
// intervention (fix the root cause, flip it back to 'pending') to resume.
async function findNextEligibleMessage() {
    //making sure failed events from issues won't keep projecting
    //never events
    const blockedByFailure = await prisma.outboxMessage.findMany({
        where: { status: "failed" },
        select: { aggregateId: true },
        distinct: ["aggregateId"]
    })
    const blockedAggregateIds = blockedByFailure.map((row) => row.aggregateId)

    const candidates = await prisma.outboxMessage.findMany({
        where: {
            status: { in: ["pending", "processing"] },
            aggregateId: { notIn: blockedAggregateIds }
        },
        orderBy: { createdAt: "asc" },
        take: HEAD_SCAN_BATCH_SIZE
    })

    //within one scan, for each aggregate, 
    // only its oldest unresolved message is ever 
    // eligible to be returned — never a newer one, 
    // even if the newer one is individually ready 
    // and the older one isn't.
    const seenAggregateIds = new Set<string>()
    for (const candidate of candidates) {
        if (seenAggregateIds.has(candidate.aggregateId)) continue
        seenAggregateIds.add(candidate.aggregateId)
        if (candidate.availableAt > new Date()) continue
        return candidate
    }
    return null
}

async function relayTick(): Promise<boolean> {
    const next = await findNextEligibleMessage()
    if (!next) return false

    // Reusing availableAt as "not actionable before this time" for two purposes:
    // retry backoff after a failure, and a stall timeout so a message stuck in
    // 'processing' (e.s) wont block a new try
    const claimed = await prisma.outboxMessage.updateMany({
        where: { id: next.id, status: next.status, availableAt: next.availableAt },
        data: { status: "processing", availableAt: new Date(Date.now() + STALL_TIMEOUT_MS) }
    })
    if (claimed.count === 0) return true

    try {
        // Project + mark done in one transaction: if the process died between the two,
        // the stall-timeout reclaim would otherwise replay the projection a second time
        // on top of itself, and array pushes (assigneeIds, labels) aren't idempotent.
        await prisma.$transaction(async (tx) => {
            const event = await tx.event.findUniqueOrThrow({ where: { id: next.eventId } })
            await projectIssueEvent(tx, event as unknown as StoredEvent)
            await tx.outboxMessage.update({
                where: { id: next.id },
                data: { status: "done", processedAt: new Date() }
            })
        })
    } catch (err) {
        const attempts = next.attempts + 1
        const failed = attempts >= MAX_ATTEMPTS
        const backoffMs = Math.min(BASE_BACKOFF_MS * 2 ** attempts, MAX_BACKOFF_MS)

        console.error(`Outbox projection failed for event ${next.eventId} (attempt ${attempts})`, err)

        await prisma.outboxMessage.update({
            where: { id: next.id },
            data: {
                status: failed ? "failed" : "pending",
                attempts,
                lastError: err instanceof Error ? err.message : String(err),
                availableAt: new Date(Date.now() + backoffMs)
            }
        })
    }

    return true
}

const DEFAULT_LANE_COUNT = 10
const IDLE_SLEEP_MS = 200

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

// Multiple lanes running the same claim-and-process loop concurrently is safe without
// any extra coordination: the optimistic claim in relayTick means at most one lane ever
// wins a given message, and the per-issue-head restriction means different lanes
// naturally gravitate to different issues' heads (a claimed head's availableAt is
// pushed into the future immediately, so a concurrent scan skips straight past it to
// the next issue). This turns "N issues with pending work" into N-way real parallelism.
// It does NOT help when most of the backlog belongs to one issue — that issue's events
// are still required to apply strictly in order, one at a time, no matter how many
// lanes are running.
async function relayLane(isStopped: () => boolean) {
    while (!isStopped()) {
        let didWork = false
        try {
            didWork = await relayTick()
        } catch (err) {
            console.error("Outbox relay lane crashed", err)
        }
        if (!didWork) await sleep(IDLE_SLEEP_MS)
    }
}

export function startOutboxRelay(laneCount = DEFAULT_LANE_COUNT) {
    let stopped = false
    const isStopped = () => stopped

    for (let i = 0; i < laneCount; i++) {
        relayLane(isStopped)
    }

    return () => {
        stopped = true
    }
}
