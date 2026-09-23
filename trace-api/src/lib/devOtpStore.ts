// In-memory only, never persisted — holds the most recently generated login
// code per email so non-production tooling (e2e tests, local debugging) can
// read it without needing access to the bcrypt hash stored in the DB.
// Callers must gate writes/reads behind env.nodeEnv !== 'production' themselves.
const lastCodeByEmail = new Map<string, string>()

export const devOtpStore = {
    set: (email: string, code: string) => {
        lastCodeByEmail.set(email.toLowerCase(), code)
    },

    get: (email: string) => {
        return lastCodeByEmail.get(email.toLowerCase())
    }
}
