import { test, expect } from '@playwright/test';

/**
 * E2E test: Complete authentication flow
 * Tests the Slack OAuth integration and user session management
 */

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start with a clean session
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('should redirect unauthenticated users to Slack OAuth', async ({ page }) => {
    // Visit the dashboard without authentication
    await page.goto('/');

    // Should be redirected to auth page
    await expect(page).toHaveURL(/\/auth/);

    // Should see Slack OAuth button
    const signInButton = page.locator('text=Sign in with Slack');
    await expect(signInButton).toBeVisible();
  });

  test('should initiate Slack OAuth flow when clicking sign in', async ({ page }) => {
    // Go to auth page
    await page.goto('/auth');

    // Click sign in with Slack
    const signInButton = page.locator('text=Sign in with Slack');
    await signInButton.click();

    // Should redirect to Slack OAuth (or mock OAuth in test environment)
    if (process.env.NODE_ENV === 'test') {
      // In test environment, mock the OAuth flow
      await expect(page).toHaveURL(/\/api\/auth\/slack/);
    } else {
      // In real environment, should redirect to Slack
      await expect(page.url()).toContain('slack.com/oauth');
    }
  });

  test('should handle OAuth callback and create user session', async ({ page }) => {
    // Mock successful OAuth callback
    const mockCode = 'test_oauth_code';
    const mockState = 'test_state';

    // Navigate to OAuth callback with mock parameters
    await page.goto(`/api/auth/slack/callback?code=${mockCode}&state=${mockState}`);

    // Should redirect to dashboard after successful authentication
    await expect(page).toHaveURL('/');

    // Should show authenticated content
    await expect(page.locator('text=Welcome')).toBeVisible();
    await expect(page.locator('text=Channel Lists')).toBeVisible();
  });

  test('should persist session across page reloads', async ({ page }) => {
    // Simulate authenticated state
    await authenticateUser(page);

    // Verify user is on dashboard
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Channel Lists')).toBeVisible();

    // Reload the page
    await page.reload();

    // Should still be authenticated
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Channel Lists')).toBeVisible();

    // Should not redirect to auth
    await expect(page).not.toHaveURL(/\/auth/);
  });

  test('should handle OAuth errors gracefully', async ({ page }) => {
    // Navigate to OAuth callback with error
    await page.goto('/api/auth/slack/callback?error=access_denied');

    // Should redirect back to auth page with error
    await expect(page).toHaveURL(/\/auth/);

    // Should show error message
    await expect(page.locator('text=Authentication failed')).toBeVisible();
    await expect(page.locator('text=access_denied')).toBeVisible();
  });

  test('should handle invalid OAuth state', async ({ page }) => {
    // Navigate to OAuth callback with invalid state
    await page.goto('/api/auth/slack/callback?code=valid_code&state=invalid_state');

    // Should redirect back to auth page with error
    await expect(page).toHaveURL(/\/auth/);

    // Should show security error
    await expect(page.locator('text=Invalid authentication state')).toBeVisible();
  });

  test('should sign out user and clear session', async ({ page }) => {
    // Authenticate user first
    await authenticateUser(page);

    // Verify authenticated state
    await expect(page.locator('text=Channel Lists')).toBeVisible();

    // Click sign out button
    const signOutButton = page.locator('text=Sign Out');
    await signOutButton.click();

    // Should redirect to auth page
    await expect(page).toHaveURL(/\/auth/);

    // Should show sign in button
    await expect(page.locator('text=Sign in with Slack')).toBeVisible();

    // Session should be cleared - visiting dashboard should redirect to auth
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle expired session tokens', async ({ page }) => {
    // Authenticate user
    await authenticateUser(page);

    // Simulate expired token by manipulating local storage
    await page.evaluate(() => {
      const expiredToken = JSON.stringify({
        token: 'expired_token',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      });
      localStorage.setItem('firebase_auth_token', expiredToken);
    });

    // Try to access protected content
    await page.goto('/');

    // Should redirect to auth due to expired token
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should display user information after authentication', async ({ page }) => {
    // Authenticate user
    await authenticateUser(page);

    // Should display user info in header/navbar
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
    await expect(page.locator('text=Test User')).toBeVisible();

    // User menu should show user details
    await page.locator('[data-testid="user-menu-trigger"]').click();
    await expect(page.locator('text=test@example.com')).toBeVisible();
    await expect(page.locator('text=Test Workspace')).toBeVisible();
  });

  test('should handle multiple browser tabs correctly', async ({ context }) => {
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    // Authenticate in first tab
    await authenticateUser(page1);

    // Second tab should also be authenticated (shared session)
    await page2.goto('/');
    await expect(page2.locator('text=Channel Lists')).toBeVisible();

    // Sign out in first tab
    await page1.locator('text=Sign Out').click();

    // Second tab should also be signed out
    await page2.reload();
    await expect(page2).toHaveURL(/\/auth/);
  });

  test('should prevent access to protected pages without authentication', async ({ page }) => {
    const protectedPages = ['/', '/channel-lists', '/messages'];

    for (const url of protectedPages) {
      await page.goto(url);
      await expect(page).toHaveURL(/\/auth/);
    }
  });
});

/**
 * Helper function to authenticate a user for testing
 */
async function authenticateUser(page: any) {
  // In test environment, use mock authentication
  if (process.env.NODE_ENV === 'test') {
    // Mock Firebase auth token
    await page.evaluate(() => {
      const mockUser = {
        uid: 'test_user_id',
        email: 'test@example.com',
        displayName: 'Test User',
        slackUserId: 'U123456789',
        slackTeamId: 'T123456789',
      };

      // Mock Firebase auth state
      (window as any).__FIREBASE_AUTH_MOCK__ = {
        currentUser: mockUser,
        isAuthenticated: true,
      };

      // Store mock token
      localStorage.setItem(
        'firebase_auth_token',
        JSON.stringify({
          token: 'mock_token',
          expiresAt: Date.now() + 3600000, // 1 hour from now
          user: mockUser,
        })
      );
    });

    // Navigate to dashboard
    await page.goto('/');
  } else {
    // In real environment, go through actual OAuth flow
    await page.goto('/auth');
    await page.locator('text=Sign in with Slack').click();
    // Would need to handle real Slack OAuth here
  }
}
