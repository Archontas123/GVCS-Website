/**
 * Selectors for admin login page elements
 */
export const adminLoginSelectors = {
  // Form elements
  usernameInput: 'input[name="username"]',
  passwordInput: 'input[name="password"]',
  loginButton: 'button[type="submit"]',
  loginForm: 'form',

  // Messages and states
  errorMessage: '[data-testid="error-message"]',
  loadingSpinner: '.spinner',

  // Navigation elements
  backToTeamPortalButton: 'button:has-text("Return to Team Portal")',

  // Page identifiers
  adminLoginPage: 'h1:has-text("Hack The Valley")',
  adminPortalHeading: 'h2:has-text("Administrator Portal")',

  // Dashboard elements (for post-login verification)
  adminDashboard: '[data-testid="admin-dashboard"]',
  dashboardTitle: 'h1:has-text("Admin Dashboard")'
} as const;

/**
 * Common test utilities for admin authentication
 */
export const adminTestUtils = {
  // Valid test credentials (from mock auth in backend)
  validCredentials: {
    username: 'admin',
    password: 'password123'
  },

  // Invalid credentials for negative testing
  invalidCredentials: {
    username: 'wronguser',
    password: 'wrongpass'
  },

  // URLs
  urls: {
    adminLogin: '/admin/login',
    adminDashboard: '/admin/dashboard',
    teamPortal: '/'
  },

  // Local storage keys
  storageKeys: {
    adminToken: 'programming_contest_admin_token'
  },

  // API endpoints
  apiEndpoints: {
    adminLogin: '/api/admin/login',
    adminProfile: '/api/admin/profile'
  }
} as const;

/**
 * Helper function to wait for network requests to complete
 */
export const waitForNetworkIdle = async (page: any, timeout = 5000) => {
  await page.waitForLoadState('networkidle', { timeout });
};

/**
 * Helper function to clear local storage
 */
export const clearAdminAuth = async (page: any) => {
  try {
    await page.evaluate((key) => {
      if (typeof Storage !== 'undefined' && localStorage) {
        localStorage.removeItem(key);
      }
    }, adminTestUtils.storageKeys.adminToken);
  } catch (error) {
    // Ignore localStorage access errors (e.g., in file:// protocol)
    console.warn('Failed to clear localStorage:', error);
  }
};

/**
 * Helper function to check if admin token exists in localStorage
 */
export const getAdminToken = async (page: any): Promise<string | null> => {
  try {
    return await page.evaluate((key) => {
      if (typeof Storage !== 'undefined' && localStorage) {
        return localStorage.getItem(key);
      }
      return null;
    }, adminTestUtils.storageKeys.adminToken);
  } catch (error) {
    // Ignore localStorage access errors (e.g., in file:// protocol)
    console.warn('Failed to access localStorage:', error);
    return null;
  }
};