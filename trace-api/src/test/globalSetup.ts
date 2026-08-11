// Runs once for the whole test run (not per test file), before any
// worker spawns. Changes to process.env here are inherited by workers.
import { execSync } from "child_process"
import "../config/env"

export async function setup() {
    execSync("npx prisma migrate deploy", {
        env: process.env,
    })
}
