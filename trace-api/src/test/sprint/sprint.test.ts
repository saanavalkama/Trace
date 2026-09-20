import { describe, expect, it, vi } from "vitest";
import request from 'supertest'
import app from "../../app";
import { emailSender } from "../../lib/emailSender";

async function loginAndGetAccessToken(email:string){
    await request(app).post('/auth/request-code').send({email})
    const [ , code] = vi.mocked(emailSender.sendOtpEmail).mock.calls.at(-1)!
    const res = await request(app).post('/auth/verify-code').send({email, code})
    return res.body.accessToken as string
}

async function createWorkspaceWithSprint(ownerEmail:string, sprintName:string){
    const accessToken = await loginAndGetAccessToken(ownerEmail)

    const workspaceRes = await request(app)
        .post('/workspaces')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({name: 'Acme Inc'})

    const sprintRes = await request(app)
        .post(`/workspaces/${workspaceRes.body.id}/sprints`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({name: sprintName, startDate: '2026-01-01', endDate: '2026-01-14'})

    return {accessToken, workspaceId: workspaceRes.body.id, sprintId: sprintRes.body.id}
}

describe('cross-workspace sprint access', ()=>{
    it('404s reading another workspace\'s sprint through your own workspace id', async()=>{
        const a = await createWorkspaceWithSprint('owner-a@test.com', 'Sprint A')
        const b = await createWorkspaceWithSprint('owner-b@test.com', 'Sprint B')

        const res = await request(app)
            .get(`/workspaces/${b.workspaceId}/sprints/${a.sprintId}`)
            .set('Authorization', `Bearer ${b.accessToken}`)

        expect(res.status).toBe(404)
    })

    it('404s updating another workspace\'s sprint', async()=>{
        const a = await createWorkspaceWithSprint('owner-a@test.com', 'Sprint A')
        const b = await createWorkspaceWithSprint('owner-b@test.com', 'Sprint B')

        const res = await request(app)
            .patch(`/workspaces/${b.workspaceId}/sprints/${a.sprintId}`)
            .set('Authorization', `Bearer ${b.accessToken}`)
            .send({name: 'Hijacked'})

        expect(res.status).toBe(404)
    })

    it('404s deleting another workspace\'s sprint', async()=>{
        const a = await createWorkspaceWithSprint('owner-a@test.com', 'Sprint A')
        const b = await createWorkspaceWithSprint('owner-b@test.com', 'Sprint B')

        const res = await request(app)
            .delete(`/workspaces/${b.workspaceId}/sprints/${a.sprintId}`)
            .set('Authorization', `Bearer ${b.accessToken}`)

        expect(res.status).toBe(404)
    })

    it('still allows reading/updating a sprint that belongs to your own workspace', async()=>{
        const a = await createWorkspaceWithSprint('owner-a@test.com', 'Sprint A')

        const getRes = await request(app)
            .get(`/workspaces/${a.workspaceId}/sprints/${a.sprintId}`)
            .set('Authorization', `Bearer ${a.accessToken}`)
        expect(getRes.status).toBe(200)

        const updateRes = await request(app)
            .patch(`/workspaces/${a.workspaceId}/sprints/${a.sprintId}`)
            .set('Authorization', `Bearer ${a.accessToken}`)
            .send({name: 'Renamed'})
        expect(updateRes.status).toBe(200)
        expect(updateRes.body.name).toBe('Renamed')
    })
})
