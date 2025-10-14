import { test, expect } from '@playwright/test';

test.describe('Admin Login - Simple Tests', () => {
  test('should successfully login with valid credentials', async ({ page }) => {
    // Navigate to admin login page
    await page.goto('http://localhost:3001/admin/login');

    // Wait for page to load
    await page.waitForSelector('input[name="username"]');

    // Clear localStorage if needed (but only after page loads)
    try {
      await page.evaluate(() => {
        if (typeof Storage !== 'undefined' && localStorage) {
          localStorage.removeItem('programming_contest_admin_token');
        }
      });
    } catch (error) {
      console.log('localStorage clear failed (might be okay):', error);
    }

    // Fill in credentials
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'password123');

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for redirect (should go to admin dashboard)
    await page.waitForURL('**/admin/dashboard', { timeout: 10000 });

    // Verify we're on the dashboard
    expect(page.url()).toContain('/admin/dashboard');

    // Verify token is stored
    const token = await page.evaluate(() => {
      if (typeof Storage !== 'undefined' && localStorage) {
        return localStorage.getItem('programming_contest_admin_token');
      }
      return null;
    });

    expect(token).toBeTruthy();

    console.log('Login successful! Token stored:', !!token);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Navigate to admin login page
    await page.goto('http://localhost:3001/admin/login');

    // Wait for page to load
    await page.waitForSelector('input[name="username"]');

    // Fill in invalid credentials
    await page.fill('input[name="username"]', 'wronguser');
    await page.fill('input[name="password"]', 'wrongpass');

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for error message to appear
    await page.waitForSelector('[data-testid="error-message"]', { timeout: 5000 });

    // Verify error message is visible
    const errorMessage = await page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Invalid credentials');

    // Should still be on login page
    expect(page.url()).toContain('/admin/login');

    console.log('Error handling works correctly');
  });

  test('should validate empty fields', async ({ page }) => {
    // Navigate to admin login page
    await page.goto('http://localhost:3001/admin/login');

    // Wait for page to load
    await page.waitForSelector('input[name="username"]');

    // Try to submit without filling fields
    await page.click('button[type="submit"]');

    // Wait for error message
    await page.waitForSelector('[data-testid="error-message"]', { timeout: 5000 });

    // Verify error message
    const errorMessage = await page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Please fill in all fields');

    console.log('Field validation works correctly');
  });
});