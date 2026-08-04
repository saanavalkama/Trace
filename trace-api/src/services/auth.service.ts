import crypto from 'crypto'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { loginCodeRepository } from '../repositories/loginCodeRepository'
import { emailSender } from '../lib/emailSender'
import { InvalidCodeError } from '../errors/errors'
import { userRepository } from '../repositories/user.repository'
import { env } from '../config/env'
import { inviteRepository } from '../repositories/invite.repository'
import { inviteService } from './invite.service'

const CODE_TTL_MS = 5 * 60 * 1000
const RESEND_COOLDOWN_MS = 60 * 1000
const MAX_ATTEMPS = 5
const BCRYPT_COST = 12

// Bcrypt hash of a value that can never match a real code, used to keep
// verifyCode's timing consistent when no login-code record exists.
const DUMMY_HASH = '$2b$12$53gbOd/q9mbsUsIJNa1GCO3MpPSWEvimyKnUHyBqd5jHidN3NluAC'

function generateCode():string{
    return crypto.randomInt(100000,1000000).toString()
}

export const authService = {

    requestCode: async (email:string, inviteToken?:string) => {

        let effectiveInviteToken = inviteToken

        if(!effectiveInviteToken){
            const pendingInvites = await inviteRepository.getAllPendingInvites(email)
            if(pendingInvites.length === 1){
                effectiveInviteToken = pendingInvites[0].token
            }
        }

        const existing = await loginCodeRepository.findByEmail(email)

        // Silently no-op within the cooldown window so a burst of requests
        // can't be used to spam the inbox or repeatedly reset the attempt counter.
        if(existing && existing.createdAt.getTime() + RESEND_COOLDOWN_MS > Date.now()){
            return
        }

        const code = generateCode()
        const codeHash = await bcrypt.hash(code, BCRYPT_COST)
        const expiresAt = new Date(Date.now() + CODE_TTL_MS)

        await loginCodeRepository.upsertForEmail(email, {codeHash, expiresAt, attemps:0, inviteToken:effectiveInviteToken})
        await emailSender.sendOtpEmail(email,code)
    },

    verifyCode: async(email:string, code:string) => {
        const record = await loginCodeRepository.findByEmail(email)

        const isLocked = !record || record.expiresAt < new Date() || record.attemps >= MAX_ATTEMPS

        // Always run a bcrypt comparison, even on a missing/expired/locked
        // record, so response timing doesn't leak which case applies.
        const isMatch = await bcrypt.compare(code, isLocked ? DUMMY_HASH : record.codeHash)

        if(isLocked || !isMatch){
            if(record && !isLocked){
                await loginCodeRepository.incrementAttemps(email)
            }
            throw new InvalidCodeError()
        }

        await loginCodeRepository.deleteByEmail(email)

        const user = await userRepository.findOrCreateByEmail(email)

        if(record.inviteToken){
            await inviteService.acceptInvite(record.inviteToken, user.id)
        }

        const token = jwt.sign({ sub: user.id, email: user.email }, env.jwtSecret, {
            expiresIn: env.jwtExpiresIn,
        } as jwt.SignOptions)

        return { user, token }
    }
}