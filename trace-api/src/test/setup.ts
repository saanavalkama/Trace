// Runs before each test file. Guarantees .env.test is loaded before
// modules like db/prisma.ts read process.env at import time.
import "../config/env"
import { beforeEach, vi } from 'vitest'
import { prisma } from "../db/prisma"
import { afterAll, afterEach } from "vitest"

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(async () => {
  // wipe all tables between tests, respecting FK order
  await prisma.workspaceInvite.deleteMany()
  await prisma.workspaceMember.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.loginCode.deleteMany()
  await prisma.workspace.deleteMany()
  await prisma.user.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

vi.mock('../lib/emailSender', () => ({
  emailSender: {
    sendOtpEmail: vi.fn(),
    sendInviteEmail: vi.fn(),
  },
}))
