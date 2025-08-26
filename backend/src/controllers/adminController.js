/**
 * Admin Controller - Phase 2.1
 * Handles admin authentication and management
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../utils/db');
const { 
  ValidationError, 
  AuthenticationError, 
  ConflictError,
  DatabaseError 
} = require('../utils/errors');

/**
 * Admin Model Class
 */
class Admin {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.email = data.email;
    this.password_hash = data.password_hash;
    this.role = data.role;
    this.created_at = data.created_at;
  }

  /**
   * Validate admin registration data
   */
  static validateRegistrationData(data) {
    const errors = [];

    if (!data.username || data.username.trim().length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    if (data.username && data.username.length > 50) {
      errors.push('Username must not exceed 50 characters');
    }
    if (data.username && !/^[a-zA-Z0-9_-]+$/.test(data.username)) {
      errors.push('Username can only contain letters, numbers, underscores, and hyphens');
    }

    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Valid email address is required');
    }
    if (data.email && data.email.length > 255) {
      errors.push('Email must not exceed 255 characters');
    }

    if (!data.password || data.password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    if (data.password && data.password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    }

    if (data.role && data.role !== 'admin') {
      errors.push('Role must be admin');
    }

    if (errors.length > 0) {
      throw new ValidationError('Admin validation failed', errors.map(msg => ({ message: msg })));
    }
  }

  /**
   * Hash password
   */
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password
   */
  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate JWT token
   */
  static generateToken(admin) {
    const payload = {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      type: 'admin'
    };

    const options = {
      expiresIn: process.env.ADMIN_TOKEN_EXPIRES || '8h',
      issuer: 'hackathon-platform'
    };

    return jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key', options);
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      throw new AuthenticationError('Invalid or expired token');
    }
  }

  /**
   * Create admin account
   */
  static async create(adminData) {
    this.validateRegistrationData(adminData);

    // Check if username already exists
    const existingUsername = await db('admins').where('username', adminData.username.trim()).first();
    if (existingUsername) {
      throw new ConflictError('Username already exists');
    }

    // Check if email already exists
    const existingEmail = await db('admins').where('email', adminData.email.trim().toLowerCase()).first();
    if (existingEmail) {
      throw new ConflictError('Email already registered');
    }

    try {
      const hashedPassword = await this.hashPassword(adminData.password);

      const [result] = await db('admins').insert({
        username: adminData.username.trim(),
        email: adminData.email.trim().toLowerCase(),
        password_hash: hashedPassword,
        role: adminData.role || 'admin'
      }).returning('id');

      const createdAdmin = await this.findById(result.id);
      return createdAdmin;
    } catch (error) {
      throw new DatabaseError('Failed to create admin account', error);
    }
  }

  /**
   * Authenticate admin login
   */
  static async authenticate(username, password) {
    if (!username || !password) {
      throw new ValidationError('Username and password are required');
    }

    try {
      // Try database authentication first
      const admin = await db('admins')
        .where('username', username.trim())
        .orWhere('email', username.trim().toLowerCase())
        .first();

      if (!admin) {
        throw new AuthenticationError('Invalid credentials');
      }

      const isValidPassword = await this.verifyPassword(password, admin.password_hash);
      if (!isValidPassword) {
        throw new AuthenticationError('Invalid credentials');
      }

      const adminInstance = new Admin(admin);
      const token = this.generateToken(adminInstance);

      return {
        admin: {
          id: adminInstance.id,
          username: adminInstance.username,
          email: adminInstance.email,
          role: adminInstance.role,
          created_at: adminInstance.created_at
        },
        token
      };
    } catch (error) {
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }
      // If database error, fall back to hardcoded credentials
      if (username.trim() === 'admin' && password === 'password123') {
        const mockAdmin = {
          id: 1,
          username: 'admin',
          email: 'admin@hackathon.local',
          role: 'admin',
          created_at: new Date().toISOString()
        };

        const token = this.generateToken(mockAdmin);

        return {
          admin: mockAdmin,
          token
        };
      }
      throw new DatabaseError('Authentication failed', error);
    }
  }

  /**
   * Find admin by ID
   */
  static async findById(adminId) {
    try {
      const admin = await db('admins')
        .select('*')
        .where('id', adminId)
        .first();

      if (!admin) {
        throw new AuthenticationError('Admin not found');
      }

      return new Admin(admin);
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      // Fallback for development when database is not available
      if (adminId === 1) {
        const mockAdmin = {
          id: 1,
          username: 'admin',
          email: 'admin@hackathon.local',
          password_hash: null,
          role: 'admin',
          created_at: new Date().toISOString()
        };
        return new Admin(mockAdmin);
      }
      throw new DatabaseError('Failed to fetch admin', error);
    }
  }

  /**
   * Find admin by username
   */
  static async findByUsername(username) {
    try {
      const admin = await db('admins')
        .select('*')
        .where('username', username.trim())
        .first();

      if (!admin) {
        throw new AuthenticationError('Admin not found');
      }

      return new Admin(admin);
    } catch (error) {
      if (error instanceof AuthenticationError) throw error;
      throw new DatabaseError('Failed to fetch admin', error);
    }
  }

  /**
   * Get all admins (excluding passwords)
   */
  static async findAll() {
    try {
      const admins = await db('admins')
        .select('id', 'username', 'email', 'role', 'created_at')
        .orderBy('created_at', 'desc');

      return admins.map(admin => new Admin({ ...admin, password_hash: null }));
    } catch (error) {
      throw new DatabaseError('Failed to fetch admins', error);
    }
  }

  /**
   * Update admin profile
   */
  static async updateProfile(adminId, updateData) {
    const allowedFields = ['email'];
    const updates = {};

    // Only allow certain fields to be updated
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        updates[key] = updateData[key];
      }
    });

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('No valid fields to update');
    }

    // Validate email if provided
    if (updates.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updates.email)) {
      throw new ValidationError('Valid email address is required');
    }

    // Check if email is already taken
    if (updates.email) {
      const existingEmail = await db('admins')
        .where('email', updates.email.trim().toLowerCase())
        .where('id', '!=', adminId)
        .first();
      
      if (existingEmail) {
        throw new ConflictError('Email already in use');
      }
    }

    try {
      await db('admins')
        .where('id', adminId)
        .update(updates);

      return await this.findById(adminId);
    } catch (error) {
      throw new DatabaseError('Failed to update admin profile', error);
    }
  }

  /**
   * Change admin password
   */
  static async changePassword(adminId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
      throw new ValidationError('Current password and new password are required');
    }

    if (newPassword.length < 6) {
      throw new ValidationError('New password must be at least 6 characters long');
    }

    const admin = await this.findById(adminId);
    const isValidPassword = await this.verifyPassword(currentPassword, admin.password_hash);
    
    if (!isValidPassword) {
      throw new AuthenticationError('Current password is incorrect');
    }

    try {
      const hashedPassword = await this.hashPassword(newPassword);
      
      await db('admins')
        .where('id', adminId)
        .update({ password_hash: hashedPassword });

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      throw new DatabaseError('Failed to change password', error);
    }
  }

  /**
   * Get admin statistics (contests created, etc.)
   */
  static async getStatistics(adminId) {
    try {
      const [contestsCount, activeContestsCount] = await Promise.all([
        db('contests').where('created_by', adminId).count('* as count').first(),
        db('contests')
          .where('created_by', adminId)
          .where('is_active', true)
          .count('* as count')
          .first()
      ]);

      return {
        contests_created: parseInt(contestsCount.count),
        active_contests: parseInt(activeContestsCount.count)
      };
    } catch (error) {
      throw new DatabaseError('Failed to fetch admin statistics', error);
    }
  }
}

module.exports = Admin;