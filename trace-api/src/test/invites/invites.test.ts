import { describe, expect, it, vi } from "vitest"
import request from 'supertest'
import app from '../../app'
import { prisma } from '../../db/prisma'
import { emailSender } from '../../lib/emailSender'
import { inviteService } from '../../services/invite.service'
import { inviteRepository } from '../../repositories/invite.repository'
import { WorkspaceRole } from '../../generated/prisma/enums'
import { InviteStatus } from '../../generated/prisma/enums'

async function loginAndGetAccessToken(email: string) {
    await request(app).post('/auth/request-code').send({ email })
    const [, code] = vi.mocked(emailSender.sendOtpEmail).mock.calls.at(-1)!
    const res = await request(app).post('/auth/verify-code').send({ email, code })
    return res.body.accessToken as string
}

async function createWorkspace(accessToken: string, name = 'Acme Inc') {
    const res = await request(app)
        .post('/workspaces')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name })
    return res.body as { id: string, name: string }
}

function sendInvite(accessToken: string, workspaceId: string, email: string, role: WorkspaceRole = WorkspaceRole.member) {
    return request(app)
        .post(`/workspaces/${workspaceId}/invites`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email, role })
}

function createInviteRecord(workspaceId: string, email: string, expiresAt: Date, role: WorkspaceRole = WorkspaceRole.member) {
    return inviteRepository.createInvite(workspaceId, { email, role, expiresAt })
}

describe('POST /workspaces/:id/invites', () => {
    it('returns 409 for a duplicate pending invite to the same email', async () => {
        const ownerAT = await loginAndGetAccessToken('owner@test.com')
        const workspace = await createWorkspace(ownerAT)

        const first = await sendInvite(ownerAT, workspace.id, 'invitee@test.com')
        expect(first.status).toBe(201)

        const second = await sendInvite(ownerAT, workspace.id, 'invitee@test.com')
        expect(second.status).toBe(409)

        const invites = await prisma.workspaceInvite.findMany({ where: { workspaceId: workspace.id, email: 'invitee@test.com' } })
        expect(invites).toHaveLength(1)
    })

    it('returns 409 when the invited email already belongs to a member', async () => {
        const ownerAT = await loginAndGetAccessToken('owner@test.com')
        const workspace = await createWorkspace(ownerAT)

        const res = await sendInvite(ownerAT, workspace.id, 'owner@test.com')

        expect(res.status).toBe(409)
        expect(res.body.message).toMatch(/already a member/i)
    })

    it('does not let an expired pending invite block a new invite to the same email', async () => {
        const ownerAT = await loginAndGetAccessToken('owner@test.com')
        const workspace = await createWorkspace(ownerAT)

        await createInviteRecord(workspace.id, 'invitee@test.com', new Date(Date.now() - 1000))

        const res = await sendInvite(ownerAT, workspace.id, 'invitee@test.com')

        expect(res.status).toBe(201)

        const invites = await prisma.workspaceInvite.findMany({ where: { workspaceId: workspace.id, email: 'invitee@test.com' } })
        expect(invites).toHaveLength(2)
    })
})

describe('GET /invites/:token', () => {
    it('returns 404 when the token does not exist', async () => {
        const res = await request(app).get('/invites/does-not-exist')

        expect(res.status).toBe(404)
    })

    it('returns 410 EXPIRED for an expired invite', async () => {
        const ownerAT = await loginAndGetAccessToken('owner@test.com')
        const workspace = await createWorkspace(ownerAT)

        const invite = await createInviteRecord(workspace.id, 'invitee@test.com', new Date(Date.now() - 1000))

        const res = await request(app).get(`/invites/${invite.token}`)

        expect(res.status).toBe(410)
        expect(res.body.message).toBe('EXPIRED')
    })

    it('returns 410 for an already accepted invite', async () => {
        const ownerAT = await loginAndGetAccessToken('owner@test.com')
        const workspace = await createWorkspace(ownerAT)

        const invite = await createInviteRecord(workspace.id, 'invitee@test.com', new Date(Date.now() + 60_000))
        await inviteRepository.markAccepted(invite.token)

        const res = await request(app).get(`/invites/${invite.token}`)

        expect(res.status).toBe(410)
        expect(res.body.message).toBe('ALREADY_ACCEPTED')
    })

    it('returns 410 for an already declined invite', async () => {
        const ownerAT = await loginAndGetAccessToken('owner@test.com')
        const workspace = await createWorkspace(ownerAT)

        const invite = await createInviteRecord(workspace.id, 'invitee@test.com', new Date(Date.now() + 60_000))
        await inviteRepository.markDeclined(invite.token)

        const res = await request(app).get(`/invites/${invite.token}`)

        expect(res.status).toBe(410)
        expect(res.body.message).toBe('ALREADY_DECLINED')
    })
})

describe('POST /invites/:token/decline', () => {
    it('declines a pending invite', async () => {
        const ownerAT = await loginAndGetAccessToken('owner@test.com')
        const workspace = await createWorkspace(ownerAT)

        const invite = await createInviteRecord(workspace.id, 'invitee@test.com', new Date(Date.now() + 60_000))

        const res = await request(app).post(`/invites/${invite.token}/decline`)

        expect(res.status).toBe(204)

        const record = await prisma.workspaceInvite.findUnique({ where: { token: invite.token } })
        expect(record?.status).toBe(InviteStatus.declined)
    })

    it('does not double-process an already-declined invite', async () => {
        const ownerAT = await loginAndGetAccessToken('owner@test.com')
        const workspace = await createWorkspace(ownerAT)

        const invite = await createInviteRecord(workspace.id, 'invitee@test.com', new Date(Date.now() + 60_000))
        await inviteRepository.markDeclined(invite.token)

        const res = await request(app).post(`/invites/${invite.token}/decline`)

        expect(res.status).toBe(410)

        const record = await prisma.workspaceInvite.findUnique({ where: { token: invite.token } })
        expect(record?.status).toBe(InviteStatus.declined)
    })
})

describe('invite acceptance on login', () => {
    it('full accept chain: request-code with inviteToken creates membership and marks the invite accepted', async () => {
        const ownerAT = await loginAndGetAccessToken('owner@test.com')
        const workspace = await createWorkspace(ownerAT)

        const inviteRes = await sendInvite(ownerAT, workspace.id, 'newmember@test.com', WorkspaceRole.admin)
        expect(inviteRes.status).toBe(201)

        const invite = await prisma.workspaceInvite.findFirstOrThrow({ where: { workspaceId: workspace.id, email: 'newmember@test.com' } })

        await request(app).post('/auth/request-code').send({ email: 'newmember@test.com', inviteToken: invite.token })
        const [, code] = vi.mocked(emailSender.sendOtpEmail).mock.calls.at(-1)!

        const verifyRes = await request(app).post('/auth/verify-code').send({ email: 'newmember@test.com', code })
        expect(verifyRes.status).toBe(200)

        const user = await prisma.user.findUniqueOrThrow({ where: { email: 'newmember@test.com' } })
        const membership = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } }
        })

        expect(membership).not.toBeNull()
        expect(membership?.role).toBe(WorkspaceRole.admin)

        const updatedInvite = await prisma.workspaceInvite.findUnique({ where: { token: invite.token } })
        expect(updatedInvite?.status).toBe(InviteStatus.accepted)
    })

    it('auto-attaches the single pending invite when request-code is sent without a token', async () => {
        const ownerAT = await loginAndGetAccessToken('owner@test.com')
        const workspace = await createWorkspace(ownerAT)

        const inviteRes = await sendInvite(ownerAT, workspace.id, 'autoinvite@test.com')
        expect(inviteRes.status).toBe(201)

        await request(app).post('/auth/request-code').send({ email: 'autoinvite@test.com' })
        const [, code] = vi.mocked(emailSender.sendOtpEmail).mock.calls.at(-1)!

        const verifyRes = await request(app).post('/auth/verify-code').send({ email: 'autoinvite@test.com', code })
        expect(verifyRes.status).toBe(200)

        const user = await prisma.user.findUniqueOrThrow({ where: { email: 'autoinvite@test.com' } })
        const membership = await prisma.workspaceMember.findFirst({ where: { workspaceId: workspace.id, userId: user.id } })

        expect(membership).not.toBeNull()

        const invite = await prisma.workspaceInvite.findFirstOrThrow({ where: { workspaceId: workspace.id, email: 'autoinvite@test.com' } })
        expect(invite.status).toBe(InviteStatus.accepted)
    })

    it('does not guess when there are two or more pending invites for the same email', async () => {
        const ownerAT = await loginAndGetAccessToken('owner@test.com')
        const workspaceOne = await createWorkspace(ownerAT, 'Workspace One')
        const workspaceTwo = await createWorkspace(ownerAT, 'Workspace Two')

        expect((await sendInvite(ownerAT, workspaceOne.id, 'ambiguous@test.com')).status).toBe(201)
        expect((await sendInvite(ownerAT, workspaceTwo.id, 'ambiguous@test.com')).status).toBe(201)

        await request(app).post('/auth/request-code').send({ email: 'ambiguous@test.com' })
        const [, code] = vi.mocked(emailSender.sendOtpEmail).mock.calls.at(-1)!

        const verifyRes = await request(app).post('/auth/verify-code').send({ email: 'ambiguous@test.com', code })
        expect(verifyRes.status).toBe(200)

        const user = await prisma.user.findUniqueOrThrow({ where: { email: 'ambiguous@test.com' } })
        const memberships = await prisma.workspaceMember.findMany({ where: { userId: user.id } })

        expect(memberships).toHaveLength(0)

        const invites = await prisma.workspaceInvite.findMany({ where: { email: 'ambiguous@test.com' } })
        expect(invites).toHaveLength(2)
        expect(invites.every((invite) => invite.status === InviteStatus.pending)).toBe(true)
    })

    it('signs up normally with no pending invites and touches nothing invite-related', async () => {
        const email = 'plainsignup@test.com'

        await request(app).post('/auth/request-code').send({ email })
        const [, code] = vi.mocked(emailSender.sendOtpEmail).mock.calls.at(-1)!

        const verifyRes = await request(app).post('/auth/verify-code').send({ email, code })
        expect(verifyRes.status).toBe(200)

        const user = await prisma.user.findUniqueOrThrow({ where: { email } })

        const memberships = await prisma.workspaceMember.findMany({ where: { userId: user.id } })
        expect(memberships).toHaveLength(0)
    })

    it('accepting an invite while already a member does not throw and still marks the invite accepted', async () => {
        const ownerAT = await loginAndGetAccessToken('owner@test.com')
        const workspace = await createWorkspace(ownerAT)

        const user = await prisma.user.create({ data: { email: 'alreadymember@test.com' } })
        await prisma.workspaceMember.create({
            data: { workspaceId: workspace.id, userId: user.id, role: WorkspaceRole.member }
        })

        const invite = await createInviteRecord(workspace.id, 'alreadymember@test.com', new Date(Date.now() + 60_000))

        await expect(inviteService.acceptInvite(invite.token, user.id)).resolves.not.toThrow()

        const memberships = await prisma.workspaceMember.findMany({ where: { workspaceId: workspace.id, userId: user.id } })
        expect(memberships).toHaveLength(1)

        const updatedInvite = await prisma.workspaceInvite.findUnique({ where: { token: invite.token } })
        expect(updatedInvite?.status).toBe(InviteStatus.accepted)
    })
})
