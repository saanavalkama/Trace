import { Router } from "express";
import { requireAuth } from "../middleware/authorization.middleware";
import { workspaceController } from "../controllers/workspace.controller";
import { requireRole } from "../middleware/requireRole.middleware";
import { WorkspaceRole } from "../generated/prisma/enums";

const router = Router()

router.use(requireAuth)

router.post('/',workspaceController.createWorkspace)
router.get('/', workspaceController.getWorkspaces)
router.get(
    '/:id', 
    requireRole(WorkspaceRole.admin,WorkspaceRole.member, WorkspaceRole.owner), 
    workspaceController.getWorkspaceById
)
router.patch(
    '/:id',
    requireRole(WorkspaceRole.owner),
    workspaceController.updateWorkspace
)
router.delete(
    '/:id',
    requireRole(WorkspaceRole.owner),
    workspaceController.deleteWorkspace

)
router.get(
    '/:id/members',
    requireRole(WorkspaceRole.admin,WorkspaceRole.member,WorkspaceRole.owner),
    workspaceController.getMembers


)
router.delete(
    '/:id/members/:userId',
    requireRole(WorkspaceRole.admin, WorkspaceRole.owner),
    workspaceController.removeMember
)

router.post(
    '/:id/invites',
    requireRole(WorkspaceRole.admin, WorkspaceRole.owner),
    workspaceController.sendInvite
)

router.post(
    '/:id/many-invites',
    requireRole(WorkspaceRole.admin, WorkspaceRole.owner),
    workspaceController.sendManyInvites
)

router.get(
    '/:id/invites',
    requireRole(WorkspaceRole.admin, WorkspaceRole.owner),
    workspaceController.getInvites
)

export default router