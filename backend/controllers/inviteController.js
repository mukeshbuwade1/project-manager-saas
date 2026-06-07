import Invite from '../models/Invite.js';
import User from '../models/User.js';
import Workspace from '../models/Workspace.js';
import WorkspaceMember from '../models/WorkspaceMember.js';

/**
 * POST /api/workspaces/:workspaceId/invites
 * Admin or Manager — invite a user by email to the workspace.
 */
export const sendInvite = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { email, role = 'member' } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const validRoles = ['admin', 'manager', 'member'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if that email is already a workspace member
    const existingUser = await User.findOne({ email: normalizedEmail }).select('_id');
    if (existingUser) {
      const alreadyMember = await WorkspaceMember.exists({
        workspaceId,
        userId: existingUser._id,
      });
      if (alreadyMember) {
        return res.status(409).json({
          success: false,
          message: 'This user is already a member of this workspace',
        });
      }
    }

    // Cancel any existing pending invite for this email+workspace, then create a fresh one
    await Invite.updateMany(
      { email: normalizedEmail, workspaceId, status: 'pending' },
      { status: 'cancelled' }
    );

    const invite = await Invite.create({
      workspaceId,
      email: normalizedEmail,
      role,
      invitedBy: req.user.userId,
      status: 'pending',
    });

    const populated = await invite.populate([
      { path: 'workspaceId', select: 'name description' },
      { path: 'invitedBy', select: 'name email' },
    ]);

    return res.status(201).json({ success: true, data: { invite: populated } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/workspaces/:workspaceId/invites
 * Admin or Manager — list all pending invites for the workspace.
 */
export const getWorkspaceInvites = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    const invites = await Invite.find({ workspaceId, status: 'pending' })
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: { invites } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/invites/my-invites
 * Returns all pending invites sent to the currently logged-in user's email.
 */
export const getMyInvites = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const user = await User.findById(userId).select('email');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const invites = await Invite.find({
      email: user.email,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    })
      .populate('workspaceId', 'name description slug')
      .populate('invitedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: { invites } });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/invites/:inviteId/accept
 * Accept a pending invite — creates a WorkspaceMember record.
 */
export const acceptInvite = async (req, res, next) => {
  try {
    const { inviteId } = req.params;
    const userId = req.user.userId;

    const user = await User.findById(userId).select('email');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const invite = await Invite.findOne({
      _id: inviteId,
      email: user.email,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }).populate('workspaceId', 'name description slug inviteCode inviteCodeExpiresAt');

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found, already accepted, or expired',
      });
    }

    // Check not already a member
    const alreadyMember = await WorkspaceMember.findOne({
      workspaceId: invite.workspaceId._id,
      userId,
    });

    if (alreadyMember) {
      invite.status = 'accepted';
      await invite.save();
      return res.status(200).json({
        success: true,
        data: {
          workspace: { ...invite.workspaceId.toObject(), role: alreadyMember.role },
          alreadyMember: true,
        },
      });
    }

    // Create membership
    await WorkspaceMember.create({
      workspaceId: invite.workspaceId._id,
      userId,
      role: invite.role,
      joinedAt: new Date(),
    });

    invite.status = 'accepted';
    await invite.save();

    return res.status(201).json({
      success: true,
      data: {
        workspace: { ...invite.workspaceId.toObject(), role: invite.role },
        alreadyMember: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/invites/:inviteId
 * Admin/Manager — cancel (revoke) a pending invite.
 */
export const cancelInvite = async (req, res, next) => {
  try {
    const { inviteId } = req.params;
    const workspaceId = req.workspaceId;

    const invite = await Invite.findOne({ _id: inviteId, workspaceId, status: 'pending' });
    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found' });
    }

    invite.status = 'cancelled';
    await invite.save();

    return res.status(200).json({ success: true, data: { message: 'Invite cancelled' } });
  } catch (error) {
    next(error);
  }
};
