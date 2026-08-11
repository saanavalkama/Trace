import { Router } from "express";
import { inviteController } from "../controllers/invite.controller";

const router = Router()

router.get('/:token', inviteController.getInviteByToken)
router.post('/:token/decline', inviteController.declineInvite)

export default router