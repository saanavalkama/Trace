import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authController } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/authorization.middleware";

const router = Router()

const requestCodeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {message: "Too many requests, please try again later"},
})

const verifyCodeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {message: "Too many requests, please try again later"},
})

router.post('/request-code', requestCodeLimiter, authController.requestCode)
router.post('/verify-code', verifyCodeLimiter, authController.verifyCode)
router.post('/refresh', requireAuth, authController.refresh)
router.post('/logout',authController.logout)

export default router