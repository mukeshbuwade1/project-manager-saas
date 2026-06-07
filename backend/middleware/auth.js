import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is missing or malformed',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token is missing',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    // Attach user info to request
    req.user = {
      userId: decoded.sub,
      workspaceId: decoded.workspaceId || null,
      role: decoded.role || null,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Access token has expired',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Access token is invalid',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
    });
  }
};

export default authMiddleware;
