/**
 * Admin Authentication Middleware - Phase 2.1
 * Handles admin JWT token verification and authorization
 */

const Admin = require('../controllers/adminController');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');

/**
 * Middleware to verify admin JWT token
 */
const verifyAdminToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw new AuthenticationError('Authorization header is required');
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    
    if (!token) {
      throw new AuthenticationError('Token is required');
    }

    // Verify token
    const decoded = Admin.verifyToken(token);
    
    if (decoded.type !== 'admin') {
      throw new AuthenticationError('Invalid token type');
    }

    // Fetch fresh admin data
    const admin = await Admin.findById(decoded.id);
    
    // Add admin info to request object
    req.admin = {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      created_at: admin.created_at
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if user is admin (simplified - only admin role exists now)
 */
const requireAdmin = (req, res, next) => {
  try {
    if (!req.admin) {
      throw new AuthenticationError('Admin authentication required');
    }

    if (req.admin.role !== 'admin' && req.admin.role !== 'super_admin') {
      throw new AuthorizationError('Admin role required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if admin can access resource (same as requireAdmin now since there's only one admin role)
 */
const requireSuperAdmin = requireAdmin;

/**
 * Middleware to check if admin can access contest
 * (all admins can access any contest now)
 */
const requireContestAccess = async (req, res, next) => {
  try {
    if (!req.admin) {
      throw new AuthenticationError('Admin authentication required');
    }

    if (req.admin.role !== 'admin' && req.admin.role !== 'super_admin') {
      throw new AuthorizationError('Admin role required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional admin auth - continues if no token provided
 */
const optionalAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
    
    if (!token) {
      return next();
    }

    try {
      const decoded = Admin.verifyToken(token);
      
      if (decoded.type === 'admin') {
        const admin = await Admin.findById(decoded.id);
        req.admin = {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          created_at: admin.created_at
        };
      }
    } catch (authError) {
      // Ignore auth errors in optional auth
      console.warn('Optional admin auth failed:', authError.message);
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyAdminToken,
  requireAdmin,
  requireRole: requireAdmin, // Backward compatibility
  requireSuperAdmin,
  requireContestAccess,
  optionalAdminAuth
};