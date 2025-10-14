import { test as base, expect } from '@playwright/test';
import { adminTestUtils, adminLoginSelectors, clearAdminAuth, getAdminToken } from '../utils/selectors';

export interface AdminAuthFixtures {
  adminLoginPage: any;
  authenticatedAdminPage: any;
}

/**
 * Admin authentication test fixtures
 */
export const test = base.extend<AdminAuthFixtures>({
  /**
   * Fixture that navigates to admin login page and ensures clean state
   */
  adminLoginPage: async ({ page }, use) => {
    // Navigate to admin login page first
    await page.goto(adminTestUtils.urls.adminLogin);

    // Wait for page to load
    await expect(page.locator(adminLoginSelectors.adminLoginPage)).toBeVisible();

    // Now clear any existing authentication (after page is loaded)
    await clearAdminAuth(page);

    await use(page);
  },

  /**
   * Fixture that provides an authenticated admin session
   */
  authenticatedAdminPage: async ({ page }, use) => {
    // Navigate to admin login page
    await page.goto(adminTestUtils.urls.adminLogin);

    // Wait for page to load
    await expect(page.locator(adminLoginSelectors.adminLoginPage)).toBeVisible();

    // Clear any existing authentication (after page is loaded)
    await clearAdminAuth(page);

    // Fill in valid credentials
    await page.fill(adminLoginSelectors.usernameInput, adminTestUtils.validCredentials.username);
    await page.fill(adminLoginSelectors.passwordInput, adminTestUtils.validCredentials.password);

    // Submit the form
    await page.click(adminLoginSelectors.loginButton);

    // Wait for redirect to admin dashboard
    await page.waitForURL('**/admin/dashboard');

    // Verify authentication token is stored
    const token = await getAdminToken(page);
    expect(token).toBeTruthy();

    await use(page);
  }
});

/**
 * Helper function to perform admin login
 */
export const performAdminLogin = async (page: any, username: string, password: string) => {
  await page.fill(adminLoginSelectors.usernameInput, username);
  await page.fill(adminLoginSelectors.passwordInput, password);
  await page.click(adminLoginSelectors.loginButton);
};

/**
 * Helper function to verify successful login
 */
export const verifySuccessfulLogin = async (page: any) => {
  // Should redirect to admin dashboard
  await page.waitForURL('**/admin/dashboard');

  // Should have token in localStorage
  const token = await getAdminToken(page);
  expect(token).toBeTruthy();

  // Should be on dashboard page
  expect(page.url()).toContain('/admin/dashboard');
};

/**
 * Helper function to verify login failure
 */
export const verifyLoginFailure = async (page: any, expectedErrorMessage?: string) => {
  // Should still be on login page
  expect(page.url()).toContain('/admin/login');

  // Should show error message
  await expect(page.locator(adminLoginSelectors.errorMessage)).toBeVisible();

  if (expectedErrorMessage) {
    await expect(page.locator(adminLoginSelectors.errorMessage)).toContainText(expectedErrorMessage);
  }

  // Should not have token in localStorage
  const token = await getAdminToken(page);
  expect(token).toBeFalsy();
};

export { expect };