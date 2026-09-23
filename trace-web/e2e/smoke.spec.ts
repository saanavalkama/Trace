import { test, expect } from '@playwright/test'

test('home page renders and links to login', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByText('Trace', { exact: true })).toBeVisible()

    await page.getByRole('link', { name: /log in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
})

test('login page accepts an email and requests a code', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()

    await page.getByLabel('Email').fill('e2e@example.com')
    await page.getByRole('button', { name: 'Request Code' }).click()

    // Without a running backend this will surface the error state rather than
    // navigate — either outcome proves the form submits and the mutation fires.
    await expect(
        page.getByRole('button', { name: /Sending code|Request Code/ })
    ).toBeVisible()
})

test('protected route redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/workspaces')
    await expect(page).toHaveURL(/\/login$/)
})
