import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authController } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/authorization.middleware";
import { env } from "../config/env";

const router = Router()

const requestCodeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.nodeEnv === "test",
    message: {message: "Too many requests, please try again later"},
})

const verifyCodeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.nodeEnv === "test",
    message: {message: "Too many requests, please try again later"},
})

router.post('/request-code', requestCodeLimiter, authController.requestCode)
router.post('/verify-code', verifyCodeLimiter, authController.verifyCode)
router.post('/refresh', authController.refresh)
router.post('/logout',authController.logout)
router.get('/me', requireAuth, authController.me)

// Dev/test-only escape hatch so e2e tests can read the OTP a real
// request-code call generated, without needing inbox access. Never mounted
// in production — see devOtpStore.ts.
if(env.nodeEnv !== 'production'){
    router.get('/dev/last-code', authController.getDevLastCode)
}

export default router