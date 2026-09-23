import { redis } from '../shared/redis'

// Bridges the narrow window right after a refresh token is rotated: a second
// request racing against the exact same token (e.g. a sibling browser tab
// refreshing at nearly the same instant) can look up what the winner got
// instead of being treated as a stolen-token replay. The TTL *is* the grace
// window — once an entry expires, a request presenting that same old token
// is no longer assumed to be a benign race, and is treated as reuse.
const STASH_TTL_SECONDS = 3
const KEY_PREFIX = 'refresh-race:'
// The shared redis client retries forever on a dropped connection (by design,
// for the streaming consumers) — fine for a background loop, not fine for a
// request in the middle of a login flow. This bounds how long the auth path
// waits on Redis before giving up, independent of that client's own policy.
const REDIS_TIMEOUT_MS = 300
// The winner still has to create a new DB row and then write the stash entry
// after it wins the claim — a loser can easily finish its own lookup before
// that write lands. This retries the read briefly rather than concluding
// "no stash" from a single check that simply arrived too early. A genuine
// stale replay (nothing will ever show up) only pays this as fixed latency
// before correctly being rejected.
const READ_RETRY_ATTEMPTS = 4
const READ_RETRY_DELAY_MS = 50

interface StashedRotation {
    rawToken: string
    userId: string
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('refreshTokenStash: redis timed out')), REDIS_TIMEOUT_MS)
        promise
            .then((value) => { clearTimeout(timer); resolve(value) })
            .catch((err) => { clearTimeout(timer); reject(err) })
    })
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export const refreshTokenStash = {
    // Best-effort — if this fails or is slow, the only cost is a future
    // concurrent request not getting the grace-window benefit, so failures
    // are swallowed rather than surfaced to the winning request.
    set: async(oldTokenHash: string, result: StashedRotation) => {
        try {
            await withTimeout(redis.set(KEY_PREFIX + oldTokenHash, JSON.stringify(result), 'EX', STASH_TTL_SECONDS))
        } catch (err) {
            console.error('refreshTokenStash.set failed', err)
        }
    },

    // A single, immediate check — no retry. Exposed mainly for callers that
    // don't need (or don't want to pay for) the retry-and-wait behavior below.
    // Fails closed: Redis being unreachable or slow reads the same as "nothing
    // stashed yet."
    get: async(oldTokenHash: string): Promise<StashedRotation | null> => {
        try {
            const raw = await withTimeout(redis.get(KEY_PREFIX + oldTokenHash))
            return raw ? JSON.parse(raw) : null
        } catch (err) {
            console.error('refreshTokenStash.get failed', err)
            return null
        }
    },

    // What rotate() actually calls: retries briefly before concluding there's
    // truly nothing there, since a loser can easily check before the winner's
    // write has landed. Still fails closed if Redis itself is unavailable —
    // the retries are for "not written yet", not for masking outages.
    getWithRetry: async(oldTokenHash: string): Promise<StashedRotation | null> => {
        for (let attempt = 1; attempt <= READ_RETRY_ATTEMPTS; attempt++) {
            const stashed = await refreshTokenStash.get(oldTokenHash)
            if (stashed) return stashed
            if (attempt < READ_RETRY_ATTEMPTS) await sleep(READ_RETRY_DELAY_MS)
        }
        return null
    },

    // Not used by rotate() itself — lets tests simulate the grace window
    // having elapsed deterministically, without a real multi-second sleep.
    delete: async(oldTokenHash: string) => {
        await redis.del(KEY_PREFIX + oldTokenHash)
    }
}
