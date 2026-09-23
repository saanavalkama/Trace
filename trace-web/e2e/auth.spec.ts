import { test, expect, type APIRequestContext } from '@playwright/test'
import { env } from './config/env.ts'

// The dev-only GET /auth/dev/last-code endpoint (trace-api's devOtpStore,
// never mounted when NODE_ENV=production) is what makes this possible without
// an inbox: request-code stashes the plaintext code there right before it
// hands the hash to bcrypt, so this reads back exactly what was emailed.
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

test('login flow: request code -> enter code -> redirected to workspaces', async ({ page, request }) => {
    await page.goto('/login')

    await page.getByLabel('Email').fill(env.loginEmail)
    await page.getByRole('button', { name: 'Request Code' }).click()

    await expect(page).toHaveURL(/\/verifyCode$/)
    await expect(page.getByText(env.loginEmail)).toBeVisible()

    const code = await fetchLatestCode(request, env.loginEmail)

    await page.getByLabel('Code').fill(code)
    await page.getByRole('button', { name: 'Verify Code' }).click()

    await expect(page).toHaveURL(/\/workspaces$/)
    await expect(page.getByRole('heading', { name: 'Your workspaces' })).toBeVisible()
})

test('an invalid code is rejected and the user stays on the verify screen', async ({ page, request }) => {
    await page.goto('/login')

    await page.getByLabel('Email').fill(env.loginEmail)
    await page.getByRole('button', { name: 'Request Code' }).click()
    await expect(page).toHaveURL(/\/verifyCode$/)

    // Make sure a real code exists for this email first so the wrong one
    // below is rejected for being wrong, not for having nothing to compare to.
    await fetchLatestCode(request, env.loginEmail)

    await page.getByLabel('Code').fill('000000')
    await page.getByRole('button', { name: 'Verify Code' }).click()

    await expect(page.getByText(/didn.t work/i)).toBeVisible()
    await expect(page).toHaveURL(/\/verifyCode$/)
})

test('session survives a reload: refresh cookie restores it on protected routes', async ({ page, request }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(env.loginEmail)
    await page.getByRole('button', { name: 'Request Code' }).click()
    await expect(page).toHaveURL(/\/verifyCode$/)

    const code = await fetchLatestCode(request, env.loginEmail)
    await page.getByLabel('Code').fill(code)
    await page.getByRole('button', { name: 'Verify Code' }).click()
    await expect(page).toHaveURL(/\/workspaces$/)

    // The access token lives in memory only (not localStorage) — a hard
    // reload should still keep the session via the httpOnly refresh cookie
    // (AuthBootstrap), not bounce back to /login.
    await page.reload()
    await expect(page).toHaveURL(/\/workspaces$/)
    await expect(page.getByRole('heading', { name: 'Your workspaces' })).toBeVisible()
})

test('reload while logged out redirects to /login, not stuck on a blank/loading screen', async ({ page }) => {
    await page.goto('/workspaces')
    await expect(page).toHaveURL(/\/login$/)

    // AuthBootstrap gates every render behind a spinner while it tries a
    // silent refresh (see AuthBootstrap.tsx) — with no session cookie at all,
    // that attempt fails fast and should still land on real page content,
    // not leave the spinner up forever.
    await page.reload()

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
})

test('logout clears the session and blocks back-navigation into protected pages', async ({ page, request }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(env.loginEmail)
    await page.getByRole('button', { name: 'Request Code' }).click()
    await expect(page).toHaveURL(/\/verifyCode$/)

    const code = await fetchLatestCode(request, env.loginEmail)
    await page.getByLabel('Code').fill(code)
    await page.getByRole('button', { name: 'Verify Code' }).click()
    await expect(page).toHaveURL(/\/workspaces$/)
    await expect(page.getByRole('heading', { name: 'Your workspaces' })).toBeVisible()

    await page.getByRole('button', { name: 'Logout' }).click()
    await expect(page).toHaveURL(/\/login$/)

    // The logout redirect uses `replace`, not `push` (see ProtectedRoute.tsx),
    // so /workspaces is excised from history rather than just sitting one
    // step behind /login — the back button can't land on it at all. But the
    // real guarantee doesn't depend on that history detail: ProtectedRoute
    // re-checks auth state on every render, not just on first mount, so even
    // landing on a stale route by some other path still redirects. Assert
    // the actual security property (no protected content, ever) rather than
    // the incidental URL history ends up producing.
    await page.goBack()
    await expect(page).not.toHaveURL(/\/workspaces$/)
    await expect(page.getByRole('heading', { name: 'Your workspaces' })).not.toBeVisible()

    await page.goBack()
    await expect(page).not.toHaveURL(/\/workspaces$/)
    await expect(page.getByRole('heading', { name: 'Your workspaces' })).not.toBeVisible()

    // And it's not just the in-app back button — directly navigating (typing
    // the URL, a bookmark, a stale tab) to a protected route after logout is
    // blocked the same way.
    await page.goto('/workspaces')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'Your workspaces' })).not.toBeVisible()
})

test('access token expiry mid-session triggers a transparent refresh, not a bounce to login', async ({ page, request }) => {
    await page.goto('/login')

    // Simulate the access token having expired by forcing exactly one 401 on
    // the first authenticated request after login — the same shape a real
    // expired/invalid JWT produces from requireAuth (see trace-api's
    // authorization.middleware.ts). Everything else passes through untouched,
    // including the retried request and the /auth/refresh call itself.
    let intercepted = false
    await page.route('**/workspaces', async (route) => {
        if (route.request().method() === 'GET' && !intercepted) {
            intercepted = true
            await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'invalid or expired token' }),
            })
            return
        }
        await route.continue()
    })

    await page.getByLabel('Email').fill(env.loginEmail)
    await page.getByRole('button', { name: 'Request Code' }).click()
    await expect(page).toHaveURL(/\/verifyCode$/)

    const code = await fetchLatestCode(request, env.loginEmail)
    await page.getByLabel('Code').fill(code)

    const refreshResponse = page.waitForResponse(
        (res) => res.url().endsWith('/auth/refresh') && res.request().method() === 'POST'
    )
    await page.getByRole('button', { name: 'Verify Code' }).click()

    // Proves the interceptor's refresh path actually fired — not just that
    // /workspaces happened to succeed for some unrelated reason.
    await refreshResponse

    await expect(page).toHaveURL(/\/workspaces$/)
    await expect(page.getByRole('heading', { name: 'Your workspaces' })).toBeVisible()

    await page.unroute('**/workspaces')
})
