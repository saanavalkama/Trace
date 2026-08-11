import { describe, expect, it, vi } from "vitest";
import { prisma } from "../../db/prisma";
import { refreshTokenService } from "../../services/token.service";
import { refreshTokenRepository } from "../../repositories/refreshToken.repository";
import { ReusedTokenError } from "../../errors/errors";
import crypto from 'crypto'
import request from 'supertest'
import app from '../../app'
import { emailSender } from "../../lib/emailSender";

describe('refreshTokenService.rotate', ()=>{
    it('revokes old token and issues a new one in the same family',async()=>{
        const user = await prisma.user.create({data: {email: 'test@test.com'}})

        const {rawToken, familyId} = await refreshTokenService.issueNewFamily(user.id)

        const {rawToken: newRawToken, userId} = await refreshTokenService.rotate(rawToken)

        expect(user.id).toBe(userId)

        expect(newRawToken).not.toBe(rawToken)

        const oldToken = await refreshTokenRepository.findByRawToken(rawToken)

        expect(oldToken?.revokedAt).not.toBeNull()

        const newToken = await refreshTokenRepository.findByRawToken(newRawToken)
        expect(newToken).not.toBeNull()
        expect(newToken?.revokedAt).toBeNull()
        expect(newToken?.familyId).toBe(familyId)

        const familyTokens = await prisma.refreshToken.findMany({where: {familyId}})

        expect(familyTokens).toHaveLength(2)
    })

    it('detects token reuse and revokes the whole family', async()=>{
        const user = await prisma.user.create({data:{email:'test@test.com'}})

        const {rawToken:firstRawToken, familyId} = await refreshTokenService.issueNewFamily(user.id)

        const {rawToken:secondRawToken, userId} = await refreshTokenService.rotate(firstRawToken)

        await expect(refreshTokenService.rotate(firstRawToken)).rejects.toThrow(ReusedTokenError)

        const secondTokenRecord = await refreshTokenRepository.findByRawToken(secondRawToken)
        expect(secondTokenRecord?.revokedAt).not.toBeNull()

        await expect(refreshTokenService.rotate(secondRawToken)).rejects.toThrow(ReusedTokenError)

        const allFamilyTokens = await prisma.refreshToken.findMany({where:{familyId}})

        expect(allFamilyTokens.every((t)=>t.revokedAt !== null)).toBe(true)
    })

    it('expired token throws and revokes the token', async()=>{
        const user = await prisma.user.create({data:{email:'test@test.com'}})

        const rawToken = 'some value'
        const familyId = crypto.randomUUID()

        await prisma.refreshToken.create({
            data:{
                userId: user.id,
                familyId,
                tokenHash: refreshTokenRepository.hashToken(rawToken),
                expiresAt: new Date(Date.now()-1000)
            }
        })

        await expect(refreshTokenService.rotate(rawToken)).rejects.toThrow(ReusedTokenError)

        const record = await refreshTokenRepository.findByRawToken(rawToken)
        expect(record?.revokedAt).not.toBeNull()

        const userTokens = await prisma.refreshToken.findMany({where:{userId:user.id}})
        expect(userTokens).toHaveLength(1)
    })

    it('throws ReusedTokenError when garbage token is used', async()=>{
        const garbage = crypto.randomBytes(40).toString('hex')

        await expect(refreshTokenService.rotate(garbage)).rejects.toThrow(ReusedTokenError)

        const record = await refreshTokenRepository.findByRawToken(garbage)
        expect(record).toBeNull()
    })

    it('logout revokes the family via the cookie and clears it', async () => {
        const email = 'httplogout@test.com'

        await request(app).post('/auth/request-code').send({ email })
        const [, code] = vi.mocked(emailSender.sendOtpEmail).mock.calls[0]

        const verifyRes = await request(app).post('/auth/verify-code').send({ email, code })
        expect(verifyRes.status).toBe(200)

        const setCookieHeader = verifyRes.headers['set-cookie']
        const cookies = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
        const sessionCookie = cookies.find((c) => c?.startsWith('refreshToken='))


        const logoutRes = await request(app)
            .post('/auth/logout')
            .set('Cookie', sessionCookie)

        expect(logoutRes.status).toBe(204)

       const logoutSetCookie = logoutRes.headers['set-cookie']
        const logoutCookies = Array.isArray(logoutSetCookie) ? logoutSetCookie : [logoutSetCookie]
        const clearedCookie = logoutCookies.find((c) => c?.startsWith('refreshToken='))

        expect(clearedCookie).toBeDefined()
        expect(clearedCookie).toMatch(/refreshToken=;/)

        const rawToken = sessionCookie.split(';')[0].split('=')[1]
        const record = await refreshTokenRepository.findByRawToken(rawToken)
        expect(record?.revokedAt).not.toBeNull()

        await expect(refreshTokenService.rotate(rawToken)).rejects.toThrow(ReusedTokenError)
})
})