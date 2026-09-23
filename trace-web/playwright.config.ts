import { defineConfig, devices } from '@playwright/test'
import { env } from './e2e/config/env.ts'

const baseURL = `http://localhost:${env.port}`

export default defineConfig({
    testDir: './e2e',
    fullyParallel: true,
    forbidOnly: env.isCI,
    retries: env.isCI ? 2 : 0,
    reporter: 'html',
    use: {
        baseURL,
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    webServer: {
        command: `npm run dev -- --port ${env.port} --strictPort`,
        url: baseURL,
        reuseExistingServer: !env.isCI,
    },
})
