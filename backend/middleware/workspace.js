import WorkspaceMember from '../models/WorkspaceMember.js';

const workspaceMiddleware = async (req, res, next) => {
  try {
    // Resolve workspaceId from params, query, or body (in that order of preference)
    const workspaceId =
      req.params.workspaceId ||
      req.query.workspaceId ||
      req.body.workspaceId;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'Workspace ID is required',
      });
    }

    const membership = await WorkspaceMember.findOne({
      workspaceId,
      userId: req.user.userId,
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this workspace',
      });
    }

    // Attach workspaceId and member role to request
    req.workspaceId = workspaceId;
    req.memberRole = membership.role;

    next();
  } catch (error) {
    next(error);
  }
};

export default workspaceMiddleware;
