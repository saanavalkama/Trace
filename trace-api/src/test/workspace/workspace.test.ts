import { describe, expect, it, vi } from "vitest";
import request from 'supertest'
import app from "../../app";
import { emailSender } from "../../lib/emailSender";
import { prisma } from "../../db/prisma";
import { userRepository } from "../../repositories/user.repository";
import { WorkspaceRole } from "../../generated/prisma/enums";
import { create } from "node:domain";

async function loginAndGetAccessToken(email:string){
    await request(app).post('/auth/request-code').send({email})
    const [ , code] = vi.mocked(emailSender.sendOtpEmail).mock.calls.at(-1)!
    const res = await request(app).post('/auth/verify-code').send({email, code})
    return res.body.accessToken as string
}

describe('POST /workspaces', ()=>{
    it('creates workspace with creator as owner', async()=>{
        const email = 'test@test.com'
        const accessToken = await loginAndGetAccessToken(email)

        const res = await request(app)
            .post('/workspaces')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({name: "Acme Inc"})

        expect(res.status).toBe(201)
        expect(res.body.name).toBe('Acme Inc')

        const user = await prisma.user.findUnique({where:{email}})

        const membership = await prisma.workspaceMember.findFirst({where: {userId: user?.id}})

        expect(membership).not.toBeNull()
        expect(membership?.role).toBe(WorkspaceRole.owner)
    })
})

describe('requireRole via GET /workspaces/:id', ()=>{
    it('status 403 when user is not member',async()=>{
        const ownerEmail = 'owner@test.com'
        const ownerAccessToken = await loginAndGetAccessToken(ownerEmail)

        const createRes = await request(app)
            .post('/workspaces')
            .set('Authorization', `Bearer ${ownerAccessToken}`)
            .send({name:'Acme Inc'})

        expect(createRes.status).toBe(201)

        const userEmail = 'test@test.com'
        const userAccessToken = await loginAndGetAccessToken(userEmail)

        const res = await request(app)
            .get(`/workspaces/${createRes.body.id}`)
            .set('Authorization',`Bearer ${userAccessToken}`)

        expect(res.status).toBe(403)
    })

    it('sends 403 when workspace member has insufficient permissions', async()=>{
        const ownerEmail = 'owner@test.com'
        const ownerAccessToken = await loginAndGetAccessToken(ownerEmail)

        const createRes = await request(app)
            .post('/workspaces')
            .set('Authorization', `Bearer ${ownerAccessToken}`)
            .send({name:'Test workspace'})

        expect(createRes.status).toBe(201)

        const user = await prisma.user.create({data:{email: 'test@test.com'}})
        await prisma.workspaceMember.create({data:{workspaceId:createRes.body.id, userId: user.id, role: WorkspaceRole.member}})

        const memberAccessToken = await loginAndGetAccessToken(user.email)

        const res = await request(app)
            .get(`/workspaces/${createRes.body.id}/invites`)
            .set('Authorization',`Bearer ${memberAccessToken}`)

        expect(res.status).toBe(403)
    })

    it('admins can succesfully access resources with permission', async()=>{
        const ownerEmail = 'owner@test.com'
        const ownerAT = await loginAndGetAccessToken(ownerEmail)

        const createRes = await request(app)
            .post('/workspaces')
            .set('Authorization', `Bearer ${ownerAT}`)
            .send({name:'test Inc'})

        expect(createRes.status).toBe(201)

        const user = await prisma.user.create({data:{email:'admin@test.com'}})
        await prisma.workspaceMember.create({data: {workspaceId:createRes.body.id, userId:user.id, role: WorkspaceRole.admin}})

        const adminAT = await loginAndGetAccessToken(user.email)

        const res = await request(app)
            .get(`/workspaces/${createRes.body.id}/invites`)
            .set('Authorization', `Bearer ${adminAT}`)

        expect(res.status).toBe(200)
    })
})

describe('DELETE /workspace/:id',()=>{
    it('Deleting workspace cascade deletes its members', async()=>{
        const ownerEmail = 'owner@test.com'
        const ownerAT = await loginAndGetAccessToken(ownerEmail)

        const createRes = await request(app)
            .post('/workspaces')
            .set('Authorization', `Bearer ${ownerAT}`)
            .send({name:'test Inc'})

        expect(createRes.status).toBe(201)

        const user = await prisma.user.create({data:{email: 'member@test.com'}})
        await prisma.workspaceMember.create({data:{
            workspaceId:createRes.body.id,
            userId: user.id,
            role: WorkspaceRole.member
        }})

        const deleteRes = await request(app)
            .delete(`/workspaces/${createRes.body.id}`)
            .set('Authorization',`Bearer ${ownerAT}`)

        expect(deleteRes.status).toBe(204)

        const members = await prisma.workspaceMember.findMany({where:{workspaceId:createRes.body.id}})
        expect(members).toHaveLength(0)
    })
})

describe('UPDATE /workspaces/:id', ()=>{
    it('Name validation works when updating workspace', async()=>{
        const ownerEmail = 'owner@test.com'
        const accessToken = await loginAndGetAccessToken(ownerEmail)

        const createRes = await request(app)
            .post('/workspaces')
            .set('Authorization',`Bearer ${accessToken}`)
            .send({name: 'test Inc'})

        expect(createRes.status).toBe(201)

        const updateRes = await request(app)
            .patch(`/workspaces/${createRes.body.id}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send({name: 't'})

        expect(updateRes.status).toBe(400)
        expect(updateRes.body.errors).toHaveProperty('name')

    })
})

describe('DELETE /:id/members/:userId', ()=>{
    it('owner cannot delete themselves', async()=>{
        const ownerEmail = 'owner@test.com'
        const accessToken = await loginAndGetAccessToken(ownerEmail)

        const createRes = await request(app)
            .post('/workspaces')
            .set('Authorization',`Bearer ${accessToken}`)
            .send({name: 'test Inc'})

        expect(createRes.status).toBe(201)

        const owner = await prisma.user.findUnique({where:{email:ownerEmail}})

        const deleteRes = await request(app)
            .delete(`/workspaces/${createRes.body.id}/members/${owner?.id}`)
            .set('Authorization',`Bearer ${accessToken}`)

        expect(deleteRes.status).toBe(409)

        const members = await prisma.workspaceMember.findMany({where:{workspaceId:createRes.body.id}})

        expect(members).toHaveLength(1)
    })

    it('admin can remove regular member', async()=>{
        const ownerEmail = 'owner@test.com'
        const ownerAT = await loginAndGetAccessToken(ownerEmail)

        const createRes = await request(app)
            .post('/workspaces')
            .set('Authorization',`Bearer ${ownerAT}`)
            .send({name:'test Inc'})

        expect(createRes.status).toBe(201)

        const adminUser = await prisma.user.create({data:{email:'admin@test.com'}})
        await prisma.workspaceMember.create({data:{
            workspaceId: createRes.body.id,
            userId:adminUser.id,
            role:WorkspaceRole.admin
        }})

        const memberUser = await prisma.user.create({data:{email:'member@test.com'}})
        await prisma.workspaceMember.create({data:{
            workspaceId: createRes.body.id,
            userId:memberUser.id,
            role: WorkspaceRole.member
        }})

        const adminAT = await loginAndGetAccessToken(adminUser.email)

        const deleteRes = await request(app)
            .delete(`/workspaces/${createRes.body.id}/members/${memberUser.id}`)
            .set('Authorization', `Bearer ${adminAT}`)

        expect(deleteRes.status).toBe(204)

        const members = await prisma.workspaceMember.findMany({where:{workspaceId:createRes.body.id}})
        expect(members).toHaveLength(2)
         
    })
})