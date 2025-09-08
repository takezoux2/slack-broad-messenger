import { expect, test } from '@playwright/test';

/**
 * Basic E2E test to validate Playwright configuration
 * This test will be replaced by actual feature tests in later tasks
 */
test.describe('Application Smoke Tests', () => {
  test('should load the homepage', async ({ page }) => {
    // Navigate to the homepage
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check if the page title is set
    await expect(page).toHaveTitle(/Slack Broad Messenger/);

    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/homepage.png' });
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/');

    // Check for basic accessibility
    // This is a placeholder - actual accessibility tests will be added later
    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    // Try to navigate to a non-existent page
    const response = await page.goto('/non-existent-page');

    // Next.js should return a 404 status
    expect(response?.status()).toBe(404);
  });
});
