import { Router } from "express";
import { requireAuth } from "../middleware/authorization.middleware";
import { requireRole } from "../middleware/requireRole.middleware";
import { issueReadController } from "../controllers/issue.read.controller";
import { WorkspaceRole } from "../generated/prisma/enums";

const router = Router()

router.use(requireAuth)
router.use(requireRole(WorkspaceRole.admin, WorkspaceRole.member, WorkspaceRole.owner))

router.get('/', issueReadController.getBoardBySprint)

export default router
