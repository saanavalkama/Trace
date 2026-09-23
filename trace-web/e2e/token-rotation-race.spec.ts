import { test, expect, type APIRequestContext, type APIResponse } from '@playwright/test'
import { env } from './config/env.ts'

async function fetchLatestCode(request: APIRequestContext, email: string) {
    let code: string | undefined

    await expect(async () => {
        const res = await request.get(`${env.apiUrl}/auth/dev/last-code`, {
            params: { email },
        })
        expect(res.ok()).toBe(true)
        code = (await res.json()).code
    }).toPass({ timeout: 10_000 })

    return code!
}

function extractRefreshToken(response: APIResponse): string | undefined {
    const setCookie = response.headersArray().find((h) => h.name.toLowerCase() === 'set-cookie')?.value
    return setCookie?.match(/refreshToken=([^;]+)/)?.[1]
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

test('two tabs refreshing near-simultaneously both succeed and converge on the same token — only a genuinely stale replay later is treated as reuse', async ({ page, context, request }) => {
    // --- Log in for real, once, via the UI. This is "tab A". ---
    await page.goto('/login')
    await page.getByLabel('Email').fill(env.loginEmail)
    await page.getByRole('button', { name: 'Request Code' }).click()
    await expect(page).toHaveURL(/\/verifyCode$/)

    const code = await fetchLatestCode(request, env.loginEmail)
    await page.getByLabel('Code').fill(code)
    await page.getByRole('button', { name: 'Verify Code' }).click()
    await expect(page).toHaveURL(/\/workspaces$/)

    const originalRefreshToken = (await context.cookies()).find((c) => c.name === 'refreshToken')?.value
    expect(originalRefreshToken).toBeTruthy()

    // --- Simulate "tab B": a second tab shares this browser's cookie jar, so if
    // its access token happens to expire around the same moment as tab A's, its
    // own independent refreshAccessToken() call fires against the exact same
    // refresh cookie tab A would use. The race lives entirely in the shared
    // cookie jar and the backend's rotation logic, not in anything tab-specific
    // — so a second raw request sharing this context is a faithful stand-in for
    // a second real tab, without the flakiness of racing two live UIs on a clock. ---
    const [resA, resB] = await Promise.all([
        context.request.post(`${env.apiUrl}/auth/refresh`),
        context.request.post(`${env.apiUrl}/auth/refresh`),
    ])

    // refreshTokenRepository.claim() atomically decides which request "wins"
    // the database race — but the loser no longer gets rejected for losing.
    // It checks refreshTokenStash (retrying briefly, since the winner still
    // has to create its new token and write the stash entry) and is handed
    // the exact same outcome instead of being treated as a stolen-token replay.
    expect(resA.status()).toBe(200)
    expect(resB.status()).toBe(200)

    const tokenA = extractRefreshToken(resA)
    const tokenB = extractRefreshToken(resB)
    expect(tokenA).toBeTruthy()
    expect(tokenB).toBe(tokenA) // the same winning token, not two divergent ones

    // --- Even the ORIGINAL pre-race token, replayed again right after, still
    // converges on the same result while inside the grace window (see
    // refreshTokenStash.ts's TTL) — it's not just the two initial racers that
    // get this treatment, anything landing within the window does. ---
    const quickReplay = await context.request.post(`${env.apiUrl}/auth/refresh`, {
        headers: { Cookie: `refreshToken=${originalRefreshToken}` },
    })
    expect(quickReplay.status()).toBe(200)
    expect(extractRefreshToken(quickReplay)).toBe(tokenA)

    // --- The user-visible proof: tab A, which never replayed anything itself
    // and has had a valid session this whole time, is completely unaffected —
    // reloading still restores it onto /workspaces, no logout. ---
    await page.reload()
    await expect(page).toHaveURL(/\/workspaces$/)
    await expect(page.getByRole('heading', { name: 'Your workspaces' })).toBeVisible()

    // --- Once the grace window has genuinely elapsed, the same replay is no
    // longer assumed to be a race — this is what actually distinguishes a
    // benign double-refresh from a real stolen-token replay. ---
    await sleep(3_500)

    const staleReplay = await context.request.post(`${env.apiUrl}/auth/refresh`, {
        headers: { Cookie: `refreshToken=${originalRefreshToken}` },
    })
    expect(staleReplay.status()).toBe(401)

    // The blast radius still applies to genuine reuse — the whole family,
    // including the earlier legitimate winner, is now dead too.
    const winnerAfterRevoke = await context.request.post(`${env.apiUrl}/auth/refresh`, {
        headers: { Cookie: `refreshToken=${tokenA}` },
    })
    expect(winnerAfterRevoke.status()).toBe(401)

    await page.reload()
    await expect(page).toHaveURL(/\/login$/)
})
