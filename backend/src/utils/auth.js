
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/** @constant {string} JWT secret key from environment variables */
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

/** @constant {string} JWT token expiration time */
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generates a JSON Web Token with the provided payload.
 * @param {Object} payload - The data to encode in the token
 * @returns {string} The signed JWT token
 * @example
 * const token = generateToken({ teamId: 123, teamName: 'Team Alpha' });
 */
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'programming_contest-platform',
    audience: 'team-client'
  });
};

/**
 * Verifies and decodes a JSON Web Token.
 * @param {string} token - The JWT token to verify
 * @returns {Object} The decoded payload if token is valid
 * @throws {Error} When token is invalid or expired
 * @example
 * const decoded = verifyToken(token);
 * console.log(decoded.teamId);
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Hashes a password using bcrypt with salt rounds of 12.
 * @param {string} password - The plain text password to hash
 * @returns {Promise<string>} The hashed password
 * @example
 * const hashedPwd = await hashPassword('mypassword123');
 */
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compares a plain text password with a hashed password.
 * @param {string} password - The plain text password
 * @param {string} hashedPassword - The hashed password to compare against
 * @returns {Promise<boolean>} True if passwords match, false otherwise
 * @example
 * const isValid = await comparePassword('mypassword123', hashedPwd);
 */
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Generates a session token with timestamp for session management.
 * @returns {string} The signed session JWT token
 * @example
 * const sessionToken = generateSessionToken();
 */
const generateSessionToken = () => {
  return jwt.sign(
    { type: 'session', timestamp: Date.now() }, 
    JWT_SECRET, 
    { expiresIn: JWT_EXPIRES_IN }
  );
};

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  generateSessionToken
};