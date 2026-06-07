// Role hierarchy: admin has the most permissions, member the least
const ROLE_HIERARCHY = {
  admin: 3,
  manager: 2,
  member: 1,
};

/**
 * Middleware factory that enforces a minimum role requirement.
 * Must be used AFTER workspaceMiddleware (which sets req.memberRole).
 *
 * @param {string} minimumRole - The minimum role required ('admin', 'manager', or 'member')
 * @returns Express middleware function
 */
const requireRole = (minimumRole) => {
  return (req, res, next) => {
    const userRoleLevel = ROLE_HIERARCHY[req.memberRole];
    const requiredRoleLevel = ROLE_HIERARCHY[minimumRole];

    if (userRoleLevel === undefined) {
      return res.status(403).json({
        success: false,
        message: 'Invalid role assignment',
      });
    }

    if (requiredRoleLevel === undefined) {
      return res.status(500).json({
        success: false,
        message: 'Invalid required role configuration',
      });
    }

    if (userRoleLevel < requiredRoleLevel) {
      return res.status(403).json({
        success: false,
        message: `This action requires at least the '${minimumRole}' role`,
      });
    }

    next();
  };
};

export { requireRole };
