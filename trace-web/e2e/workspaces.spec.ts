import { test, expect, type APIRequestContext } from '@playwright/test'
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

test('workspace creation: validation, list update, and info/settings pages — one session', async ({ page, request }) => {
    // --- Log in once; every check below reuses this same session. ---
    await page.goto('/login')
    await page.getByLabel('Email').fill(env.loginEmail)
    await page.getByRole('button', { name: 'Request Code' }).click()
    await expect(page).toHaveURL(/\/verifyCode$/)

    const code = await fetchLatestCode(request, env.loginEmail)
    await page.getByLabel('Code').fill(code)
    await page.getByRole('button', { name: 'Verify Code' }).click()
    await expect(page).toHaveURL(/\/workspaces$/)

    await page.getByRole('link', { name: '+ Add Workspace' }).click()
    await expect(page).toHaveURL(/\/workspaces\/create$/)

    // --- A too-short name is rejected with the backend's specific message. ---
    await page.getByLabel('Workspace name').fill('a')
    await page.getByRole('button', { name: 'Create workspace' }).click()
    await expect(page.getByText('Name must be at least 2 characters long')).toBeVisible()
    await expect(page).toHaveURL(/\/workspaces\/create$/)

    // --- A valid name succeeds and lands on the new workspace's own page. ---
    const workspaceName = `E2E Workspace ${Date.now()}`
    await page.getByLabel('Workspace name').fill(workspaceName)
    await page.getByRole('button', { name: 'Create workspace' }).click()
    await expect(page).toHaveURL(/\/workspaces\/[^/]+$/)
    const workspaceId = new URL(page.url()).pathname.split('/')[2]

    // --- It appears in the list immediately via client-side nav (the navbar
    // link, not page.goto — a real reload would spin up a fresh QueryClient
    // and wipe the cache regardless of whether invalidation actually worked,
    // which wouldn't prove anything). ---
    await page.getByRole('link', { name: 'Trace' }).click()
    await expect(page).toHaveURL(/\/workspaces$/)
    await expect(page.getByText(workspaceName)).toBeVisible()

    // --- Info page loads for the owner. ---
    await page.goto(`/workspaces/${workspaceId}/info`)
    await expect(page.getByRole('heading', { name: 'Issues by status' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible()
    await expect(page.getByText('Failed to load', { exact: false })).not.toBeVisible()

    // --- Settings page loads for the owner. ---
    await page.goto(`/workspaces/${workspaceId}/settings`)
    await expect(page.getByRole('heading', { name: 'Add team members' })).toBeVisible()
    await expect(page.getByText('Failed to load', { exact: false })).not.toBeVisible()
})

test('typing the URL for a workspace you are not a member of does not leak its data', async ({ page, request }) => {
    // --- Primary user logs in normally, through the UI. ---
    await page.goto('/login')
    await page.getByLabel('Email').fill(env.loginEmail)
    await page.getByRole('button', { name: 'Request Code' }).click()
    await expect(page).toHaveURL(/\/verifyCode$/)

    const code = await fetchLatestCode(request, env.loginEmail)
    await page.getByLabel('Code').fill(code)
    await page.getByRole('button', { name: 'Verify Code' }).click()
    await expect(page).toHaveURL(/\/workspaces$/)

    // --- A second, unrelated identity creates its own workspace + sprint,
    // entirely via direct API calls rather than the UI — Resend's sandbox
    // mode rejects sending to any address but the account owner's, so this
    // request-code call itself 500s, but the dev OTP store already has the
    // code stashed by the time that happens (see fetchLatestCode), so login
    // still works. This avoids a second real UI session just to set up data
    // that only needs to exist, not be interacted with. ---
    const otherEmail = 'e2e-other-owner@example.com'
    await request.post(`${env.apiUrl}/auth/request-code`, { data: { email: otherEmail } })
    const otherCode = await fetchLatestCode(request, otherEmail)
    const verifyRes = await request.post(`${env.apiUrl}/auth/verify-code`, {
        data: { email: otherEmail, code: otherCode },
    })
    const { accessToken: otherAccessToken } = await verifyRes.json()

    const otherWorkspaceRes = await request.post(`${env.apiUrl}/workspaces`, {
        headers: { Authorization: `Bearer ${otherAccessToken}` },
        data: { name: `Other Owner Workspace ${Date.now()}` },
    })
    const otherWorkspace = await otherWorkspaceRes.json()

    const secretSprintName = `Secret Sprint ${Date.now()}`
    await request.post(`${env.apiUrl}/workspaces/${otherWorkspace.id}/sprints`, {
        headers: { Authorization: `Bearer ${otherAccessToken}` },
        data: { name: secretSprintName, startDate: '2026-01-01', endDate: '2026-01-14' },
    })

    // --- Primary user types the other workspace's URL directly. A real
    // navigation (not a client-side Link) on purpose — this is specifically
    // the "typed into the address bar" scenario, and it also exercises
    // AuthBootstrap's session restore, not just ProtectedRoute's in-memory check. ---
    await page.goto(`/workspaces/${otherWorkspace.id}`)

    // No real data from the other workspace ever renders...
    await expect(page.getByText(secretSprintName)).not.toBeVisible()
    // ...and the sidebar shows this was actually blocked, not just coincidentally
    // empty. Generous timeout: the QueryClient (main.tsx) uses React Query's
    // default retry (3 attempts, exponential backoff) for every query, so a
    // 403 takes several seconds of retrying before it finally settles into
    // an error state rather than staying in a loading/pending state.
    await expect(page.getByText('Failed to load sprints')).toBeVisible({ timeout: 15_000 })
})
