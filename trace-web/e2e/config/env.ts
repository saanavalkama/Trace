function optionalEnv(key: string, fallback: string): string {
    return process.env[key] ?? fallback
}

export const env = {
    apiUrl: optionalEnv('E2E_API_URL', 'http://localhost:4000'),
    // Must match FRONTEND_URL in trace-api's .env — the backend's CORS
    // allow-list is locked to that single origin.
    port: Number(optionalEnv('E2E_PORT', '5174')),
    // Resend's sandbox mode only delivers to the account's own verified
    // address, so this must stay pointed at that address unless overridden.
    loginEmail: optionalEnv('E2E_LOGIN_EMAIL', 'saanavalkama@hotmail.com'),
    isCI: !!process.env.CI,
}
