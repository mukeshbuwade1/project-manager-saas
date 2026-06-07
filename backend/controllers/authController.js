import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { validationResult } from 'express-validator';
import User from '../models/User.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const sha256 = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const generateTokens = (userId, workspaceId = null, role = null) => {
  const accessToken = jwt.sign(
    { sub: userId, workspaceId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m' }
  );

  const refreshToken = jwt.sign(
    { sub: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d' }
  );

  return { accessToken, refreshToken };
};

const setRefreshCookie = (res, token) => {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge,
  });
};

// ─── Controllers ────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { name, email, password } = req.body;

    // Check if email already in use
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({ name, email, passwordHash });

    // Generate tokens (no workspace yet at registration)
    const { accessToken, refreshToken } = generateTokens(user._id.toString());

    // Store hash of refresh token in DB
    user.refreshTokenHash = sha256(refreshToken);
    await user.save();

    setRefreshCookie(res, refreshToken);

    return res.status(201).json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    const { email, password } = req.body;

    // Explicitly select passwordHash since it has select:false
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      '+passwordHash +refreshTokenHash'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        code: 'EMAIL_NOT_REGISTERED',
        message: 'No account found with this email address.',
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const { accessToken, refreshToken } = generateTokens(user._id.toString());

    // Rotate refresh token hash
    user.refreshTokenHash = sha256(refreshToken);
    await user.save();

    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          isVerified: user.isVerified,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 * Reads the refresh token from the httpOnly cookie, verifies it, and issues
 * new tokens (token rotation).
 */
export const refreshToken = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found',
      });
    }

    // Verify JWT signature and expiry
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is invalid or has expired',
      });
    }

    // Find user and compare stored hash
    const user = await User.findById(decoded.sub).select('+refreshTokenHash');
    if (!user || user.refreshTokenHash !== sha256(token)) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has been revoked',
      });
    }

    // Issue new token pair (rotation)
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      user._id.toString()
    );

    user.refreshTokenHash = sha256(newRefreshToken);
    await user.save();

    setRefreshCookie(res, newRefreshToken);

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 */
export const logout = async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;

    if (token) {
      // Verify and invalidate the token stored in DB
      try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        await User.findByIdAndUpdate(decoded.sub, { refreshTokenHash: null });
      } catch {
        // If token is already invalid, still clear the cookie
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (error) {
    next(error);
  }
};
