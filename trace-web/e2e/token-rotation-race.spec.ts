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

test('two tabs refreshing near-simultaneously: a stale replay revokes the whole family, logging out a tab that did nothing wrong', async ({ page, context, request }) => {
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

    // refreshTokenService.rotate() (trace-api/src/services/token.service.ts) reads
    // the token, checks revokedAt, then revokes-and-creates — with no atomic claim
    // on the row (contrast the outbox relay, which uses exactly that pattern). A
    // genuinely simultaneous dispatch can let both requests see the token as still
    // valid and both "win": this only asserts what's guaranteed to be true either
    // way — the session survived the race in some form.
    const statuses = [resA.status(), resB.status()]
    expect(statuses).toContain(200)

    // --- Replaying the ORIGINAL pre-race token now — e.g. a retried request, a
    // tab restored from sleep, or tab B simply trying again — is a definite reuse. ---
    const replay = await context.request.post(`${env.apiUrl}/auth/refresh`, {
        headers: { Cookie: `refreshToken=${originalRefreshToken}` },
    })
    expect(replay.status()).toBe(401)

    // --- The blast radius: reuse detection revokes every currently-active token
    // in the family (refreshTokenRepository.revokeFamily) — including whichever
    // fresh token(s) the race above just legitimately issued. Pull out whichever
    // response actually won and prove ITS brand-new, never-replayed token is now
    // also dead — collateral damage to a tab that did nothing wrong. ---
    const winner = resA.status() === 200 ? resA : resB
    const winnerToken = extractRefreshToken(winner)
    expect(winnerToken).toBeTruthy()

    const winnerRetry = await context.request.post(`${env.apiUrl}/auth/refresh`, {
        headers: { Cookie: `refreshToken=${winnerToken}` },
    })
    expect(winnerRetry.status()).toBe(401)

    // --- The user-visible consequence: tab A, which never replayed anything and
    // has had a perfectly valid in-memory access token this whole time, next
    // tries to restore its session (AuthBootstrap runs refreshAccessToken() on
    // every load) and finds the entire family dead. It gets logged out. ---
    await page.reload()
    await expect(page).toHaveURL(/\/login$/)
})
