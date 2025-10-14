import { test, expect } from '@playwright/test';

test('simple navigation test', async ({ page }) => {
  console.log('Starting test...');

  // Navigate to the main page first
  await page.goto('http://localhost:3001/');
  console.log('Navigated to main page');

  // Wait for page to load
  await page.waitForLoadState('networkidle');
  console.log('Page loaded');

  // Take a screenshot for debugging
  await page.screenshot({ path: 'test-main-page.png' });

  // Now navigate to admin login
  await page.goto('http://localhost:3001/admin/login');
  console.log('Navigated to admin login');

  // Wait for page to load
  await page.waitForLoadState('networkidle');

  // Take another screenshot
  await page.screenshot({ path: 'test-admin-login.png' });

  // Check if we can see any admin login elements
  const pageContent = await page.content();
  console.log('Page title:', await page.title());
  console.log('URL:', page.url());

  // Look for the login form
  const hasUsername = await page.locator('input[name="username"]').count();
  const hasPassword = await page.locator('input[name="password"]').count();

  console.log('Username input count:', hasUsername);
  console.log('Password input count:', hasPassword);

  // Basic assertion
  expect(page.url()).toContain('admin/login');
});