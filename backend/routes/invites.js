import { Router } from 'express';
import authMiddleware from '../middleware/auth.js';
import workspaceMiddleware from '../middleware/workspace.js';
import { requireRole } from '../middleware/rbac.js';
import { getMyInvites, acceptInvite, cancelInvite } from '../controllers/inviteController.js';

const router = Router();

router.use(authMiddleware);

// Current user's pending invites — no workspace membership needed
router.get('/my-invites', getMyInvites);

// Accept a specific invite
router.post('/:inviteId/accept', acceptInvite);

// Cancel (revoke) an invite — admin/manager of that workspace
router.delete('/:inviteId', workspaceMiddleware, requireRole('manager'), cancelInvite);

export default router;
