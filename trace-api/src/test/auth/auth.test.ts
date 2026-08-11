import {describe, expect, it, vi} from 'vitest'
import { emailSender } from '../../lib/emailSender'
import request from 'supertest'
import app from '../../app'
import { prisma } from '../../db/prisma'
import bcrypt from 'bcrypt'
import { send } from 'node:process'
import { email } from 'zod'


describe('POST /auth/request-code', ()=>{
    it('sends code for valid email', async()=>{
        const email = 'test@example.com'

        const res = 
            await request(app)
            .post('/auth/request-code')
            .send({email})

        expect(res.status).toBe(200)

        const record = await prisma.loginCode.findUnique({
            where:{email}
        })
        expect(record).not.toBeNull()
        expect(record?.attemps).toBe(0)

        expect(emailSender.sendOtpEmail).toHaveBeenCalledOnce()
        expect(emailSender.sendOtpEmail).toHaveBeenCalledWith(email, expect.any(String))
    })

    it('rejects malformated email', async()=>{
        const email = 'test'

        const res = await request(app).post('/auth/request-code').send({email})

        expect(res.status).toBe(400)
        expect(res.body.errors).toHaveProperty('email')

        const record = await prisma.loginCode.findUnique({where:{email}})

        expect(record).toBeNull()
        expect(emailSender.sendOtpEmail).not.toHaveBeenCalled()
    })

    // authService.requestCode gates resends with a 60s cooldown anchored to
    // the loginCode row's createdAt: any request within that window silently
    // no-ops (still 200, but no new code, no DB write, no email) so bursts of
    // requests can't spam the inbox or reset the attempt counter. Testing the
    // cooldown itself doesn't require waiting it out - two rapid requests
    // land inside the window by definition, so the no-op is what we assert.
    it('does not resend or generate a new code within the cooldown window', async()=>{
        const email = 'test@test.com'

        const firstRes = await request(app)
            .post('/auth/request-code')
            .send({email})

        expect(firstRes.status).toBe(200)

        const firstRecord = await prisma.loginCode.findUnique({where:{email}})
        expect(firstRecord).not.toBeNull()

        const secondRes = await request(app)
            .post('/auth/request-code')
            .send({email})

        expect(secondRes.status).toBe(200)

        const allRecords = await prisma.loginCode.findMany({where:{email}})

        expect(allRecords).toHaveLength(1)

        const secondRecord = allRecords[0]

        expect(secondRecord.codeHash).toBe(firstRecord?.codeHash)

        expect(secondRecord.attemps).toBe(0)

        expect(emailSender.sendOtpEmail).toHaveBeenCalledOnce()
    })

    describe('POST /auth/verify-code', ()=> {
        it('issues tokens and creates a user on correct code', async()=>{
            
            const email = "newuser@test.com"

            await request(app).post('/auth/request-code').send({email})

            const [,code] = vi.mocked(emailSender.sendOtpEmail).mock.calls[0]

            const res = await request(app).post('/auth/verify-code').send({email, code})

            expect(res.status).toBe(200)
            expect(res.body.user.email).toBe(email)
            expect(res.body.accessToken).toEqual(expect.any(String))

            const setCookieHeader = res.headers['set-cookie']
            expect(setCookieHeader).toBeDefined()
    
            const user = await prisma.user.findUnique({where:{email}})
            expect(user).not.toBeNull()

            const loginCode = await prisma.loginCode.findUnique({where:{email}})
            expect(loginCode).toBeNull()

            const refreshTokens = await prisma.refreshToken.findMany({where:{userId:user?.id}})

            expect(refreshTokens).toHaveLength(1)

        }
    )

    it('Does not duplicate user when account is already created on verify-code', async()=>{
        const email = 'test@test.com'

        await request(app).post('/auth/request-code').send({email})

        const [,code] = vi.mocked(emailSender.sendOtpEmail).mock.calls[0]

        const firstVerify = await request(app).post('/auth/verify-code').send({email, code})

        expect(firstVerify.status).toBe(200)

        const user1 = await prisma.user.findUnique({where:{email}})
        expect(user1).not.toBeNull()

        await request(app).post('/auth/request-code').send({email})

        const [,secondCode] = vi.mocked(emailSender.sendOtpEmail).mock.calls[1]

        const secondVerify = await request(app).post('/auth/verify-code').send({email, code:secondCode})

        expect(secondVerify.status).toBe(200)

        const users = await prisma.user.findMany({where:{email}})

        expect(users).toHaveLength(1)
        expect(user1?.id).toBe(users[0].id)

    })

    it('wrong code sends 400 and attemps are incremented',async()=>{
        const code = '000000'
        const email = 'test@test.com'

        await request(app).post('/auth/request-code').send({email})

        const req = await request(app).post('/auth/verify-code').send({email, code})

        expect(req.status).toBe(400)
        const loginCode = await prisma.loginCode.findUnique({where:{email}})
        expect(loginCode?.attemps).toBe(1)
    })

    it('expired code returns 400', async () => {
        const email = 'expired@test.com'
        const rawCode = '123456'

 
        const codeHash = await bcrypt.hash(rawCode, 10)
            await prisma.loginCode.create({
                data: {
                    email,
                    codeHash,
                    expiresAt: new Date(Date.now() - 1000), // 1 second in the past — already expired
                    attemps: 0,
                },
            })

        const res = await request(app)
            .post('/auth/verify-code')
            .send({ email, code: rawCode })

        expect(res.status).toBe(400)

        const user = await prisma.user.findUnique({ where: { email } })
        expect(user).toBeNull()
    })

    it('sends 400 if max attemps passed', async()=>{
        const email = 'test@test.com'

        await request(app).post('/auth/request-code').send({email})
        const [_,correctCode] = vi.mocked(emailSender.sendOtpEmail).mock.calls[0]

        await prisma.loginCode.update({
            where:{email},
            data:{
                attemps: 5
            }
        })

        const res = await request(app).post('/auth/verify-code').send({email, correctCode})

        expect(res.status).toBe(400)

        const user = await prisma.user.findUnique({where:{email}})
        expect(user).toBeNull()

        const record = await prisma.loginCode.findUnique({where:{email}})
        expect(record?.attemps).toBe(5)
    })

    it('login code deleted after succesful verify',async()=>{
        const email = 'test@test.com'

        await request(app).post('/auth/request-code').send({email})

        const [_,code] = vi.mocked(emailSender.sendOtpEmail).mock.calls[0]

        const req = await request(app).post('/auth/verify-code').send({email, code})

        expect(req.status).toBe(200)

        const record = await prisma.loginCode.findUnique({where:{email}})

        expect(record).toBeNull()
    })
    })

})


