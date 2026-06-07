import crypto from 'crypto';
import { validationResult } from 'express-validator';
import Workspace from '../models/Workspace.js';
import WorkspaceMember from '../models/WorkspaceMember.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Comment from '../models/Comment.js';
import Invite from '../models/Invite.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate a URL-safe slug from a workspace name.
 * Appends a short random suffix to ensure uniqueness.
 */
const generateSlug = (name) => {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);

  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
};

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/workspaces
 * Create a workspace and add the creator as admin.
 */
export const createWorkspace = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { name, description } = req.body;
    const userId = req.user.userId;

    const slug = generateSlug(name);

    // Auto-generate a permanent invite code at workspace creation
    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();
    // Far-future expiry — code is effectively permanent until manually regenerated
    const inviteCodeExpiresAt = new Date('2099-12-31T23:59:59Z');

    const workspace = await Workspace.create({
      name,
      description,
      slug,
      createdBy: userId,
      inviteCode,
      inviteCodeExpiresAt,
    });

    // Add creator as admin member
    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId,
      role: 'admin',
      invitedBy: null,
      joinedAt: new Date(),
    });

    // Return the workspace with the creator's role embedded —
    // consumers can trust this without a separate lookup.
    return res.status(201).json({
      success: true,
      data: { workspace: { ...workspace.toObject(), role: 'admin' } },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/workspaces
 * Return all workspaces where the requesting user is a member.
 */
export const getWorkspaces = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const memberships = await WorkspaceMember.find({ userId }).select(
      'workspaceId role joinedAt'
    );

    const workspaceIds = memberships.map((m) => m.workspaceId);

    const workspaces = await Workspace.find({ _id: { $in: workspaceIds } }).sort(
      { createdAt: -1 }
    );

    // Attach role info to each workspace
    const membershipMap = {};
    memberships.forEach((m) => {
      membershipMap[m.workspaceId.toString()] = m.role;
    });

    const result = workspaces.map((ws) => ({
      ...ws.toObject(),
      role: membershipMap[ws._id.toString()],
    }));

    return res.status(200).json({
      success: true,
      data: { workspaces: result },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/workspaces/:workspaceId
 * Return a single workspace with member count.
 */
export const getWorkspace = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const [workspace, memberCount] = await Promise.all([
      Workspace.findById(workspaceId).populate('createdBy', 'name email avatar'),
      WorkspaceMember.countDocuments({ workspaceId }),
    ]);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        workspace: {
          ...workspace.toObject(),
          memberCount,
          role: req.memberRole,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/workspaces/:workspaceId
 * Admin only — update workspace name/description/settings.
 */
export const updateWorkspace = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { workspaceId } = req.params;
    const { name, description, settings } = req.body;

    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (settings !== undefined) updateFields.settings = settings;

    const workspace = await Workspace.findByIdAndUpdate(
      workspaceId,
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: { workspace },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/workspaces/by-code/:code
 * Authenticated — preview a workspace by invite code before joining.
 * No workspace membership required (user is not a member yet).
 */
export const previewByCode = async (req, res, next) => {
  try {
    const code = (req.params.code || '').trim().toUpperCase();

    if (!code || code.length !== 8) {
      return res.status(400).json({ success: false, message: 'Enter a valid 8-character invite code' });
    }

    const workspace = await Workspace.findOne({
      inviteCode: code,
      inviteCodeExpiresAt: { $gt: new Date() },
    }).select('name description slug createdAt');

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'No workspace found for this code. It may be invalid or expired.',
      });
    }

    const memberCount = await WorkspaceMember.countDocuments({ workspaceId: workspace._id });

    // Check if the requesting user is already a member
    const alreadyMember = await WorkspaceMember.exists({
      workspaceId: workspace._id,
      userId: req.user.userId,
    });

    return res.status(200).json({
      success: true,
      data: {
        workspace: {
          _id: workspace._id,
          name: workspace.name,
          description: workspace.description,
          slug: workspace.slug,
          memberCount,
          inviteCode: code,
        },
        alreadyMember: Boolean(alreadyMember),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/workspaces/:workspaceId/invite-code
 * Admin or Manager — generate (or regenerate) a 7-day invite code.
 */
export const generateInviteCode = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    // 8-char uppercase hex code, e.g. "A3F7C120"
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const workspace = await Workspace.findByIdAndUpdate(
      workspaceId,
      { inviteCode: code, inviteCodeExpiresAt: expiresAt },
      { new: true }
    );

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    return res.status(200).json({
      success: true,
      data: { inviteCode: code, expiresAt },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/workspaces/:workspaceId/invite-code
 * Admin or Manager — retrieve the current invite code.
 */
export const getInviteCode = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId).select(
      'inviteCode inviteCodeExpiresAt'
    );

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    const isExpired =
      !workspace.inviteCode ||
      !workspace.inviteCodeExpiresAt ||
      workspace.inviteCodeExpiresAt < new Date();

    return res.status(200).json({
      success: true,
      data: {
        inviteCode: isExpired ? null : workspace.inviteCode,
        expiresAt: isExpired ? null : workspace.inviteCodeExpiresAt,
        isExpired,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/workspaces/join
 * Any authenticated user — join a workspace using an invite code.
 * No workspaceMiddleware here: the user is not yet a member.
 */
export const joinByCode = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    const userId = req.user.userId;

    if (!inviteCode || typeof inviteCode !== 'string') {
      return res.status(400).json({ success: false, message: 'Invite code is required' });
    }

    const workspace = await Workspace.findOne({
      inviteCode: inviteCode.trim().toUpperCase(),
      inviteCodeExpiresAt: { $gt: new Date() },
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or expired invite code. Ask an admin to generate a new one.',
      });
    }

    // Check if user is already a member
    const existing = await WorkspaceMember.findOne({ workspaceId: workspace._id, userId });
    if (existing) {
      // Already a member — just return the workspace with their current role
      return res.status(200).json({
        success: true,
        data: {
          workspace: { ...workspace.toObject(), role: existing.role },
          alreadyMember: true,
        },
      });
    }

    // Add as member
    await WorkspaceMember.create({
      workspaceId: workspace._id,
      userId,
      role: 'member',
      invitedBy: null,
      joinedAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      data: {
        workspace: { ...workspace.toObject(), role: 'member' },
        alreadyMember: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/workspaces/:workspaceId/members/:memberId
 * Admin only — update a member's role.
 * memberId is the WorkspaceMember document _id.
 */
export const updateMemberRole = async (req, res, next) => {
  try {
    const { workspaceId, memberId } = req.params;
    const { role } = req.body;

    const validRoles = ['admin', 'manager', 'member'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${validRoles.join(', ')}`,
      });
    }

    const membership = await WorkspaceMember.findOne({ _id: memberId, workspaceId });
    if (!membership) {
      return res.status(404).json({ success: false, message: 'Member not found in this workspace' });
    }

    // Prevent admin from changing their own role
    if (membership.userId.toString() === req.user.userId) {
      return res.status(400).json({ success: false, message: 'You cannot change your own role' });
    }

    membership.role = role;
    await membership.save();

    return res.status(200).json({
      success: true,
      data: { membership },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/workspaces/:workspaceId/members/:memberId
 * Admin only — remove a member from the workspace.
 * memberId is the WorkspaceMember document _id.
 */
export const removeMember = async (req, res, next) => {
  try {
    const { workspaceId, memberId } = req.params;

    const membership = await WorkspaceMember.findOne({ _id: memberId, workspaceId });
    if (!membership) {
      return res.status(404).json({ success: false, message: 'Member not found in this workspace' });
    }

    // Prevent removing self
    if (membership.userId.toString() === req.user.userId) {
      return res.status(400).json({ success: false, message: 'You cannot remove yourself from the workspace' });
    }

    await membership.deleteOne();

    return res.status(200).json({
      success: true,
      data: { message: 'Member removed from workspace' },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/workspaces/:workspaceId
 * Admin or Manager — permanently delete a workspace and all its data.
 */
export const deleteWorkspace = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    const projects = await Project.find({ workspaceId });
    const projectIds = projects.map((p) => p._id);

    const tasks = await Task.find({ projectId: { $in: projectIds } });
    const taskIds = tasks.map((t) => t._id);

    await Comment.deleteMany({ taskId: { $in: taskIds } });
    await Task.deleteMany({ projectId: { $in: projectIds } });
    await Project.deleteMany({ workspaceId });
    await Invite.deleteMany({ workspaceId });
    await WorkspaceMember.deleteMany({ workspaceId });
    await workspace.deleteOne();

    return res.status(200).json({
      success: true,
      data: { message: 'Workspace deleted successfully' },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/workspaces/:workspaceId/members
 * Return all members with their user details.
 */
export const getMembers = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const members = await WorkspaceMember.find({ workspaceId })
      .populate('userId', 'name email avatar isVerified createdAt')
      .populate('invitedBy', 'name email')
      .sort({ joinedAt: 1 });

    return res.status(200).json({
      success: true,
      data: { members },
    });
  } catch (error) {
    next(error);
  }
};
