import { Router } from 'express';
import { body } from 'express-validator';
import authMiddleware from '../middleware/auth.js';
import workspaceMiddleware from '../middleware/workspace.js';
import { requireRole } from '../middleware/rbac.js';
import {
  createWorkspace,
  getWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getMembers,
  updateMemberRole,
  removeMember,
  generateInviteCode,
  getInviteCode,
  joinByCode,
  previewByCode,
} from '../controllers/workspaceController.js';
import { sendInvite, getWorkspaceInvites } from '../controllers/inviteController.js';

const router = Router();

router.use(authMiddleware);

const workspaceValidation = [
  body('name').trim().notEmpty().withMessage('Workspace name is required')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('description').optional().trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
];

const updateWorkspaceValidation = [
  body('name').optional().trim().notEmpty().withMessage('Workspace name cannot be empty')
    .isLength({ max: 100 }).withMessage('Name cannot exceed 100 characters'),
  body('description').optional().trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
];

// ─── No membership check needed ─────────────────────────────────────────────

router.get('/', getWorkspaces);
router.post('/', workspaceValidation, createWorkspace);

// Must be declared before /:workspaceId to avoid "join"/"by-code" being treated as an ID
router.post('/join', joinByCode);
router.get('/by-code/:code', previewByCode);

// ─── Membership required ─────────────────────────────────────────────────────

router.get('/:workspaceId', workspaceMiddleware, getWorkspace);

router.put('/:workspaceId', workspaceMiddleware, requireRole('admin'),
  updateWorkspaceValidation, updateWorkspace);

router.delete('/:workspaceId', workspaceMiddleware, requireRole('manager'), deleteWorkspace);

router.get('/:workspaceId/members', workspaceMiddleware, getMembers);

// Admin only — update a member's role or remove them
router.patch('/:workspaceId/members/:memberId',
  workspaceMiddleware, requireRole('admin'),
  body('role').notEmpty().withMessage('Role is required'),
  updateMemberRole
);
router.delete('/:workspaceId/members/:memberId',
  workspaceMiddleware, requireRole('admin'),
  removeMember
);

// Admin/Manager — send an email invite or list pending invites
router.get('/:workspaceId/invites', workspaceMiddleware, requireRole('manager'), getWorkspaceInvites);
router.post('/:workspaceId/invites', workspaceMiddleware, requireRole('manager'), sendInvite);

// Any member can view the invite code (to share with colleagues from Settings)
router.get('/:workspaceId/invite-code', workspaceMiddleware, requireRole('member'), getInviteCode);

// Only admin/manager can regenerate
router.post('/:workspaceId/invite-code', workspaceMiddleware, requireRole('manager'), generateInviteCode);

export default router;
