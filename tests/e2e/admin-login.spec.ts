import { test, expect, performAdminLogin, verifySuccessfulLogin, verifyLoginFailure } from './fixtures/admin-auth';
import { adminTestUtils, adminLoginSelectors, clearAdminAuth, getAdminToken, waitForNetworkIdle } from './utils/selectors';

test.describe('Admin Login', () => {
  test.describe('Positive Tests', () => {
    test('should successfully login with valid credentials', async ({ adminLoginPage }) => {
      // Fill in valid credentials
      await performAdminLogin(
        adminLoginPage,
        adminTestUtils.validCredentials.username,
        adminTestUtils.validCredentials.password
      );

      // Verify successful login
      await verifySuccessfulLogin(adminLoginPage);
    });

    test('should redirect to admin dashboard after successful login', async ({ adminLoginPage }) => {
      // Perform login
      await performAdminLogin(
        adminLoginPage,
        adminTestUtils.validCredentials.username,
        adminTestUtils.validCredentials.password
      );

      // Wait for redirect
      await adminLoginPage.waitForURL('**/admin/dashboard');

      // Verify we're on the dashboard
      expect(adminLoginPage.url()).toContain('/admin/dashboard');
    });

    test('should persist authentication on page refresh', async ({ adminLoginPage }) => {
      // Perform login
      await performAdminLogin(
        adminLoginPage,
        adminTestUtils.validCredentials.username,
        adminTestUtils.validCredentials.password
      );

      // Wait for redirect
      await adminLoginPage.waitForURL('**/admin/dashboard');

      // Verify token exists
      let token = await getAdminToken(adminLoginPage);
      expect(token).toBeTruthy();

      // Refresh the page
      await adminLoginPage.reload();

      // Verify we're still authenticated and on dashboard
      expect(adminLoginPage.url()).toContain('/admin/dashboard');

      // Verify token still exists
      token = await getAdminToken(adminLoginPage);
      expect(token).toBeTruthy();
    });

    test('should accept login with email instead of username', async ({ adminLoginPage }) => {
      // Try to login with email (if supported by backend)
      await adminLoginPage.fill(adminLoginSelectors.usernameInput, 'admin@contest.local');
      await adminLoginPage.fill(adminLoginSelectors.passwordInput, adminTestUtils.validCredentials.password);
      await adminLoginPage.click(adminLoginSelectors.loginButton);

      // Should either succeed or show appropriate message
      await adminLoginPage.waitForTimeout(2000);

      // Check if we're redirected or if there's an error
      const currentUrl = adminLoginPage.url();
      if (currentUrl.includes('/admin/dashboard')) {
        // Login succeeded with email
        await verifySuccessfulLogin(adminLoginPage);
      } else {
        // Login with email might not be supported, verify we get appropriate feedback
        const errorVisible = await adminLoginPage.locator(adminLoginSelectors.errorMessage).isVisible();
        expect(errorVisible).toBeTruthy();
      }
    });
  });

  test.describe('Negative Tests', () => {
    test('should fail login with invalid username', async ({ adminLoginPage }) => {
      await performAdminLogin(
        adminLoginPage,
        adminTestUtils.invalidCredentials.username,
        adminTestUtils.validCredentials.password
      );

      await verifyLoginFailure(adminLoginPage, 'Invalid credentials');
    });

    test('should fail login with invalid password', async ({ adminLoginPage }) => {
      await performAdminLogin(
        adminLoginPage,
        adminTestUtils.validCredentials.username,
        adminTestUtils.invalidCredentials.password
      );

      await verifyLoginFailure(adminLoginPage, 'Invalid credentials');
    });

    test('should fail login with both invalid credentials', async ({ adminLoginPage }) => {
      await performAdminLogin(
        adminLoginPage,
        adminTestUtils.invalidCredentials.username,
        adminTestUtils.invalidCredentials.password
      );

      await verifyLoginFailure(adminLoginPage, 'Invalid credentials');
    });

    test('should show validation error for empty username', async ({ adminLoginPage }) => {
      // Try to submit with empty username
      await adminLoginPage.fill(adminLoginSelectors.passwordInput, adminTestUtils.validCredentials.password);
      await adminLoginPage.click(adminLoginSelectors.loginButton);

      // Should show error message
      await expect(adminLoginPage.locator(adminLoginSelectors.errorMessage)).toBeVisible();
      await expect(adminLoginPage.locator(adminLoginSelectors.errorMessage)).toContainText('Please fill in all fields');

      // Should still be on login page
      expect(adminLoginPage.url()).toContain('/admin/login');
    });

    test('should show validation error for empty password', async ({ adminLoginPage }) => {
      // Try to submit with empty password
      await adminLoginPage.fill(adminLoginSelectors.usernameInput, adminTestUtils.validCredentials.username);
      await adminLoginPage.click(adminLoginSelectors.loginButton);

      // Should show error message
      await expect(adminLoginPage.locator(adminLoginSelectors.errorMessage)).toBeVisible();
      await expect(adminLoginPage.locator(adminLoginSelectors.errorMessage)).toContainText('Please fill in all fields');

      // Should still be on login page
      expect(adminLoginPage.url()).toContain('/admin/login');
    });

    test('should show validation error for both empty fields', async ({ adminLoginPage }) => {
      // Try to submit with both fields empty
      await adminLoginPage.click(adminLoginSelectors.loginButton);

      // Should show error message
      await expect(adminLoginPage.locator(adminLoginSelectors.errorMessage)).toBeVisible();
      await expect(adminLoginPage.locator(adminLoginSelectors.errorMessage)).toContainText('Please fill in all fields');

      // Should still be on login page
      expect(adminLoginPage.url()).toContain('/admin/login');
    });

    test('should handle network errors gracefully', async ({ adminLoginPage }) => {
      // Intercept the API call and simulate network failure
      await adminLoginPage.route('**/api/admin/login', route => {
        route.abort('failed');
      });

      await performAdminLogin(
        adminLoginPage,
        adminTestUtils.validCredentials.username,
        adminTestUtils.validCredentials.password
      );

      // Should show appropriate error message
      await expect(adminLoginPage.locator(adminLoginSelectors.errorMessage)).toBeVisible();

      // Should still be on login page
      expect(adminLoginPage.url()).toContain('/admin/login');
    });
  });

  test.describe('UI/UX Tests', () => {
    test('should display loading state during login', async ({ adminLoginPage }) => {
      // Slow down the API response to catch loading state
      await adminLoginPage.route('**/api/admin/login', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.continue();
      });

      // Fill credentials
      await adminLoginPage.fill(adminLoginSelectors.usernameInput, adminTestUtils.validCredentials.username);
      await adminLoginPage.fill(adminLoginSelectors.passwordInput, adminTestUtils.validCredentials.password);

      // Click login and immediately check for loading state
      await adminLoginPage.click(adminLoginSelectors.loginButton);

      // Verify login button shows loading state
      const loginButton = adminLoginPage.locator(adminLoginSelectors.loginButton);
      await expect(loginButton).toContainText('Signing In...');
      await expect(loginButton).toBeDisabled();
    });

    test('should auto-focus username field on page load', async ({ adminLoginPage }) => {
      // Check that username field is focused
      const usernameInput = adminLoginPage.locator(adminLoginSelectors.usernameInput);
      await expect(usernameInput).toBeFocused();
    });

    test('should disable login button when form is invalid', async ({ adminLoginPage }) => {
      const loginButton = adminLoginPage.locator(adminLoginSelectors.loginButton);

      // Initially disabled (empty form)
      await expect(loginButton).toBeDisabled();

      // Still disabled with only username
      await adminLoginPage.fill(adminLoginSelectors.usernameInput, adminTestUtils.validCredentials.username);
      await expect(loginButton).toBeDisabled();

      // Still disabled with only password
      await adminLoginPage.fill(adminLoginSelectors.usernameInput, '');
      await adminLoginPage.fill(adminLoginSelectors.passwordInput, adminTestUtils.validCredentials.password);
      await expect(loginButton).toBeDisabled();

      // Enabled when both fields are filled
      await adminLoginPage.fill(adminLoginSelectors.usernameInput, adminTestUtils.validCredentials.username);
      await expect(loginButton).toBeEnabled();
    });

    test('should clear error message when user starts typing after error', async ({ adminLoginPage }) => {
      // First, trigger an error
      await performAdminLogin(
        adminLoginPage,
        adminTestUtils.invalidCredentials.username,
        adminTestUtils.invalidCredentials.password
      );

      // Verify error is shown
      await expect(adminLoginPage.locator(adminLoginSelectors.errorMessage)).toBeVisible();

      // Start typing in username field
      await adminLoginPage.fill(adminLoginSelectors.usernameInput, 'a');

      // Error should be cleared
      await expect(adminLoginPage.locator(adminLoginSelectors.errorMessage)).not.toBeVisible();
    });

    test('should navigate back to team portal when clicking back link', async ({ adminLoginPage }) => {
      // Click the back to team portal link
      await adminLoginPage.click(adminLoginSelectors.backToTeamPortalButton);

      // Should navigate to team portal
      await adminLoginPage.waitForURL('**/');
      expect(adminLoginPage.url()).toBe('http://localhost:3001/');
    });

    test('should display proper page heading and branding', async ({ adminLoginPage }) => {
      // Verify main heading
      await expect(adminLoginPage.locator(adminLoginSelectors.adminLoginPage)).toBeVisible();
      await expect(adminLoginPage.locator(adminLoginSelectors.adminLoginPage)).toContainText('Hack The Valley');

      // Verify administrator portal heading
      await expect(adminLoginPage.locator(adminLoginSelectors.adminPortalHeading)).toBeVisible();
      await expect(adminLoginPage.locator(adminLoginSelectors.adminPortalHeading)).toContainText('Administrator Portal');
    });

    test('should handle form submission with Enter key', async ({ adminLoginPage }) => {
      // Fill in credentials
      await adminLoginPage.fill(adminLoginSelectors.usernameInput, adminTestUtils.validCredentials.username);
      await adminLoginPage.fill(adminLoginSelectors.passwordInput, adminTestUtils.validCredentials.password);

      // Press Enter in password field
      await adminLoginPage.press(adminLoginSelectors.passwordInput, 'Enter');

      // Should submit and redirect
      await verifySuccessfulLogin(adminLoginPage);
    });
  });

  test.describe('Security Tests', () => {
    test('should not expose sensitive data in client-side storage', async ({ adminLoginPage }) => {
      await performAdminLogin(
        adminLoginPage,
        adminTestUtils.validCredentials.username,
        adminTestUtils.validCredentials.password
      );

      await verifySuccessfulLogin(adminLoginPage);

      // Check that password is not stored in localStorage
      const allLocalStorage = await adminLoginPage.evaluate(() => {
        const storage: { [key: string]: string } = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            storage[key] = localStorage.getItem(key) || '';
          }
        }
        return storage;
      });

      // Ensure no password is stored
      const storageValues = Object.values(allLocalStorage).join(' ').toLowerCase();
      expect(storageValues).not.toContain('password123');
      expect(storageValues).not.toContain(adminTestUtils.validCredentials.password);
    });

    test('should clear authentication on logout', async ({ authenticatedAdminPage }) => {
      // Verify we start authenticated
      const initialToken = await getAdminToken(authenticatedAdminPage);
      expect(initialToken).toBeTruthy();

      // Simulate logout by clearing token (actual logout button test would be in dashboard tests)
      await clearAdminAuth(authenticatedAdminPage);

      // Navigate back to admin login
      await authenticatedAdminPage.goto(adminTestUtils.urls.adminLogin);

      // Should be back on login page
      expect(authenticatedAdminPage.url()).toContain('/admin/login');

      // Token should be cleared
      const tokenAfterLogout = await getAdminToken(authenticatedAdminPage);
      expect(tokenAfterLogout).toBeFalsy();
    });
  });
});