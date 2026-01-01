import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import User from '../models/User.model.js';
import { USER_ROLES } from '../utils/constants.js';

/**
 * Authentication middleware - verifies JWT token
 */
export const authenticate = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedError('Not authenticated, please login');
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');
      
      if (!req.user) {
        throw new UnauthorizedError('User not found');
      }

      if (!req.user.isActive) {
        throw new UnauthorizedError('User account is inactive');
      }

      next();
    } catch (error) {
      throw new UnauthorizedError('Invalid or expired token');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization middleware - checks user role
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError(`User role '${req.user.role}' is not authorized to access this route`));
    }

    next();
  };
};

/**
 * Check if user is admin or manager
 */
export const authorizeAdminOrManager = authorize(USER_ROLES.ADMIN, USER_ROLES.MANAGER);

/**
 * Check if user is admin
 */
export const authorizeAdmin = authorize(USER_ROLES.ADMIN);

