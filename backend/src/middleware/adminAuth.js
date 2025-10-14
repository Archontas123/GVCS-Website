/**
 * @fileoverview Admin authentication middleware for the programming contest platform.
 * Provides authentication and authorization for admin-level API endpoints.
 * Handles JWT token verification, role-based access control, and admin session management.
 */

const Admin = require('../controllers/adminController');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');

/**
 * Middleware to verify admin JWT tokens and authenticate admin users.
 * Validates Bearer tokens, checks token type, fetches admin data from database,
 * and attaches admin information to the request object.
 * 
 * @async
 * @function verifyAdminToken
 * @param {Object} req - Express request object
 * @param {Object} req.headers - Request headers
 * @param {string} req.headers.authorization - Authorization header with Bearer token
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @throws {AuthenticationError} When no token provided, invalid token, or admin not found
 * @example
 * // Usage in admin route
 * router.get('/admin/dashboard', verifyAdminToken, (req, res) => {
 *   console.log(req.admin.username); // Admin username from token
 * });
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

    const decoded = Admin.verifyToken(token);
    
    if (decoded.type !== 'admin') {
      throw new AuthenticationError('Invalid token type');
    }

    const admin = await Admin.findById(decoded.id);
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
 * Middleware to enforce admin role requirements.
 * Checks that the user has been authenticated via verifyAdminToken
 * and has either 'admin' or 'super_admin' role privileges.
 * 
 * @function requireAdmin
 * @param {Object} req - Express request object
 * @param {Object} req.admin - Admin object populated by verifyAdminToken middleware
 * @param {string} req.admin.role - Admin role ('admin' or 'super_admin')
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @throws {AuthenticationError} When admin authentication is missing
 * @throws {AuthorizationError} When admin role is insufficient
 * @example
 * // Usage for admin-only endpoint
 * router.post('/admin/contests', verifyAdminToken, requireAdmin, createContest);
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
 * Middleware to enforce super admin role requirements.
 * Currently identical to requireAdmin as the system uses a simplified role model.
 * 
 * @function requireSuperAdmin
 * @param {Object} req - Express request object
 * @param {Object} req.admin - Admin object populated by verifyAdminToken middleware
 * @param {string} req.admin.role - Admin role ('admin' or 'super_admin')
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @throws {AuthenticationError} When admin authentication is missing
 * @throws {AuthorizationError} When admin role is insufficient
 * @example
 * // Usage for super admin-only endpoint
 * router.delete('/admin/system', verifyAdminToken, requireSuperAdmin, deleteSystem);
 */
const requireSuperAdmin = requireAdmin;

/**
 * Middleware to enforce contest access permissions for admins.
 * Currently all authenticated admins can access any contest.
 * Future versions may implement contest-specific permissions.
 * 
 * @async
 * @function requireContestAccess
 * @param {Object} req - Express request object
 * @param {Object} req.admin - Admin object populated by verifyAdminToken middleware
 * @param {string} req.admin.role - Admin role ('admin' or 'super_admin')
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @throws {AuthenticationError} When admin authentication is missing
 * @throws {AuthorizationError} When admin role is insufficient
 * @example
 * // Usage for contest management endpoints
 * router.put('/admin/contests/:id', verifyAdminToken, requireContestAccess, updateContest);
 */
const requireContestAccess = async (req, res, next) => {
  try {
    if (!req.admin) {
      throw new AuthenticationError('Admin authentication required');
    }

    if (req.admin.role !== 'admin' && req.admin.role !== 'super_admin') {
      throw new AuthorizationError('Admin role required');
    }

    // Skip contest ownership check for now
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional admin authentication middleware that attempts to authenticate admin users
 * but continues processing even if authentication fails or no token is provided.
 * Useful for endpoints that can work with or without admin privileges.
 * 
 * @async
 * @function optionalAdminAuth
 * @param {Object} req - Express request object
 * @param {Object} req.headers - Request headers
 * @param {string} [req.headers.authorization] - Optional authorization header with Bearer token
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @description If admin authentication succeeds, req.admin will be populated with admin data.
 *              If authentication fails or no token provided, req.admin remains undefined.
 *              Authentication errors are logged but do not stop request processing.
 * @example
 * // Usage for endpoint with optional admin context
 * router.get('/api/stats', optionalAdminAuth, (req, res) => {
 *   const isAdmin = !!req.admin;
 *   // Show different data based on admin status
 * });
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
      console.warn('Optional admin auth failed:', authError.message);
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * @module adminAuth
 * @description Exported admin authentication middleware functions.
 * @exports {Object} middleware - Collection of admin authentication middleware
 * @exports {Function} middleware.verifyAdminToken - Verifies admin JWT tokens
 * @exports {Function} middleware.requireAdmin - Requires admin role
 * @exports {Function} middleware.requireRole - Alias for requireAdmin (backward compatibility)
 * @exports {Function} middleware.requireSuperAdmin - Requires super admin role
 * @exports {Function} middleware.requireContestAccess - Requires contest access permissions
 * @exports {Function} middleware.optionalAdminAuth - Optional admin authentication
 */
module.exports = {
  verifyAdminToken,
  requireAdmin,
  requireRole: requireAdmin,
  requireSuperAdmin,
  requireContestAccess,
  optionalAdminAuth
};