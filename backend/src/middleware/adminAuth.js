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
 * Middleware to check if admin has required role
 */
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    try {
      if (!req.admin) {
        throw new AuthenticationError('Admin authentication required');
      }

      if (req.admin.role !== requiredRole && req.admin.role !== 'super_admin') {
        throw new AuthorizationError(`${requiredRole} role required`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if admin is super admin
 */
const requireSuperAdmin = (req, res, next) => {
  try {
    if (!req.admin) {
      throw new AuthenticationError('Admin authentication required');
    }

    if (req.admin.role !== 'super_admin') {
      throw new AuthorizationError('Super admin role required');
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to check if admin can access contest
 * (either created by them or they are super admin)
 */
const requireContestAccess = async (req, res, next) => {
  try {
    if (!req.admin) {
      throw new AuthenticationError('Admin authentication required');
    }

    const contestId = req.params.id || req.params.contestId;
    if (!contestId) {
      throw new ValidationError('Contest ID is required');
    }

    // Super admin can access any contest
    if (req.admin.role === 'super_admin') {
      return next();
    }

    // Check if admin created this contest
    const { db } = require('../utils/db');
    const contest = await db('contests')
      .where('id', contestId)
      .where('created_by', req.admin.id)
      .first();

    if (!contest) {
      throw new AuthorizationError('Access denied to this contest');
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
  requireRole,
  requireSuperAdmin,
  requireContestAccess,
  optionalAdminAuth
};