import { Router } from "express";
import { requireAuth } from "../middleware/authorization.middleware";
import { requireRole } from "../middleware/requireRole.middleware";
import { issueController } from "../controllers/issue.controller";
import { WorkspaceRole } from "../generated/prisma/enums";

const router = Router({ mergeParams: true })

router.use(requireAuth)
router.use(requireRole(WorkspaceRole.owner, WorkspaceRole.admin, WorkspaceRole.member))

router.post('/', issueController.create)
router.get('/search', issueController.search)
router.get('/:issueId', issueController.getById)
router.patch('/:issueId/status', issueController.changeStatus)
router.post('/:issueId/assignees', issueController.assign)
router.delete('/:issueId/assignees/:userId', issueController.unassign)
router.post('/:issueId/comments', issueController.comment)
router.post('/:issueId/labels', issueController.addLabel)
router.post('/:issueId/links', issueController.link)
router.post('/:issueId/close', issueController.close)
router.post('/:issueId/reopen', issueController.reopen)
router.patch('/:issueId/sprint', issueController.moveToSprint)

export default router
