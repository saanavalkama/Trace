import { describe, expect, it } from "vitest"
import { prisma } from "../db/prisma"
import { env } from "../config/env"

describe("test environment", () => {
    it("points at the test database, not dev", () => {
        expect(env.nodeEnv).toBe("test")
    })

    it("connects to the database and can query", async () => {
        const count = await prisma.user.count()
        expect(count).toBeGreaterThanOrEqual(0)
    })
})
