import { Router } from "express";
import { requireAuth } from "../middleware/authorization.middleware";
import { requireRole } from "../middleware/requireRole.middleware";
import { sprintController } from "../controllers/sprint.controller";
import { WorkspaceRole } from "../generated/prisma/enums";

const router = Router({ mergeParams: true })

router.use(requireAuth)

router.post(
    '/',
    requireRole(WorkspaceRole.owner, WorkspaceRole.admin),
    sprintController.create
)
router.get(
    '/',
    requireRole(WorkspaceRole.owner, WorkspaceRole.admin, WorkspaceRole.member),
    sprintController.getByWorkspaceId
)
router.get(
    '/:sprintId',
    requireRole(WorkspaceRole.owner, WorkspaceRole.admin, WorkspaceRole.member),
    sprintController.getById
)
router.patch(
    '/:sprintId',
    requireRole(WorkspaceRole.owner, WorkspaceRole.admin),
    sprintController.update
)
router.delete(
    '/:sprintId',
    requireRole(WorkspaceRole.owner, WorkspaceRole.admin),
    sprintController.delete
)

export default router
