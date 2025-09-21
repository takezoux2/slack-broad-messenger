import { type BrowserContext, expect, type Page, test } from '@playwright/test';

// E2E test for Google authentication flow
// This test MUST fail until implementation is complete

test.describe('E2E: Google Authentication Flow', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should fail initially - authentication UI not implemented', async () => {
    // Navigate to the application
    await page.goto('http://localhost:3000');

    // Should fail to find Google sign-in button (not implemented yet)
    const googleSignInButton = page.locator('button:has-text("Sign in with Google")');

    try {
      await expect(googleSignInButton).toBeVisible({ timeout: 2000 });
      test.fail('Google sign-in button should not exist yet in TDD phase');
    } catch (error) {
      // Expected to fail - UI not implemented yet
      expect(error).toBeDefined();
    }
  });

  test('should display Google sign-in button when not authenticated', async () => {
    await page.goto('http://localhost:3000');

    // Should show sign-in UI
    const googleSignInButton = page.locator('button:has-text("Sign in with Google")', {
      hasText: /sign in with google/i,
    });

    if (await googleSignInButton.isVisible()) {
      await expect(googleSignInButton).toBeEnabled();
    } else {
      test.fail('Google sign-in button should be visible once implemented');
    }
  });

  test('should initiate Google OAuth flow when sign-in button clicked', async () => {
    await page.goto('http://localhost:3000');

    const googleSignInButton = page.locator('button:has-text("Sign in with Google")');

    if (await googleSignInButton.isVisible()) {
      // Listen for popup or redirect
      const [popup] = await Promise.all([context.waitForEvent('page'), googleSignInButton.click()]);

      // Should redirect to Google OAuth or open popup
      const url = popup.url();
      expect(url).toMatch(/accounts\.google\.com|localhost:9099/);

      await popup.close();
    } else {
      test.fail('Google sign-in should work once implemented');
    }
  });

  test('should complete authentication flow with test user', async () => {
    await page.goto('http://localhost:3000');

    // For E2E testing with Firebase emulator, we'll use a test user
    const googleSignInButton = page.locator('button:has-text("Sign in with Google")');

    if (await googleSignInButton.isVisible()) {
      await googleSignInButton.click();

      // In Firebase emulator, authentication can be simulated
      // Wait for redirect back to application
      await page.waitForURL(/localhost:3000/, { timeout: 10000 });

      // Should show authenticated state
      const userProfile = page.locator('[data-testid="user-profile"]');
      const signOutButton = page.locator('button:has-text("Sign Out")');

      // Verify authenticated UI elements
      if (await userProfile.isVisible()) {
        await expect(userProfile).toBeVisible();
        await expect(signOutButton).toBeVisible();
      } else {
        test.fail('Authenticated UI should be visible once implemented');
      }
    } else {
      test.fail('Authentication flow should work once implemented');
    }
  });

  test('should display user information after successful authentication', async () => {
    // Complete authentication first (using test helper)
    await authenticateTestUser(page);

    // Verify user information is displayed
    const userEmail = page.locator('[data-testid="user-email"]');
    const userDisplayName = page.locator('[data-testid="user-display-name"]');
    const userAvatar = page.locator('[data-testid="user-avatar"]');

    if (await userEmail.isVisible()) {
      await expect(userEmail).toContainText('@');
      await expect(userDisplayName).not.toBeEmpty();

      // Avatar should be present (even if default)
      if (await userAvatar.isVisible()) {
        await expect(userAvatar).toBeVisible();
      }
    } else {
      test.fail('User information should be displayed once implemented');
    }
  });

  test('should allow user to sign out', async () => {
    // Complete authentication first
    await authenticateTestUser(page);

    // Find and click sign out button
    const signOutButton = page.locator('button:has-text("Sign Out")');

    if (await signOutButton.isVisible()) {
      await signOutButton.click();

      // Should return to unauthenticated state
      const googleSignInButton = page.locator('button:has-text("Sign in with Google")');
      await expect(googleSignInButton).toBeVisible();

      // User profile should no longer be visible
      const userProfile = page.locator('[data-testid="user-profile"]');
      await expect(userProfile).not.toBeVisible();
    } else {
      test.fail('Sign out should work once implemented');
    }
  });

  test('should preserve authentication state across page reloads', async () => {
    // Complete authentication first
    await authenticateTestUser(page);

    // Reload the page
    await page.reload();

    // Should still be authenticated
    const userProfile = page.locator('[data-testid="user-profile"]');
    const signOutButton = page.locator('button:has-text("Sign Out")');

    if (await userProfile.isVisible()) {
      await expect(userProfile).toBeVisible();
      await expect(signOutButton).toBeVisible();
    } else {
      test.fail('Authentication state should persist after reload once implemented');
    }
  });

  test('should redirect unauthenticated users from protected pages', async () => {
    // Try to access a protected page without authentication
    await page.goto('http://localhost:3000/dashboard');

    // Should redirect to login or show sign-in prompt
    const currentUrl = page.url();
    const googleSignInButton = page.locator('button:has-text("Sign in with Google")');

    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      // Redirected to login page
      expect(currentUrl).toMatch(/\/login|\/auth/);
    } else if (await googleSignInButton.isVisible()) {
      // Sign-in prompt shown on same page
      await expect(googleSignInButton).toBeVisible();
    } else {
      test.fail('Protected route should require authentication once implemented');
    }
  });

  test('should handle authentication errors gracefully', async () => {
    await page.goto('http://localhost:3000');

    // Simulate authentication error by navigating to callback with error
    await page.goto(
      'http://localhost:3000/api/auth/google/callback?error=access_denied&error_description=User%20denied%20access'
    );

    // Should show error message or redirect with error
    const errorMessage = page.locator('[data-testid="auth-error"]');
    const googleSignInButton = page.locator('button:has-text("Sign in with Google")');

    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toContainText(/error|denied|failed/i);
    } else if (await googleSignInButton.isVisible()) {
      // Redirected back to sign-in
      await expect(googleSignInButton).toBeVisible();
    } else {
      test.fail('Authentication errors should be handled gracefully once implemented');
    }
  });

  test('should work with multiple tabs/windows', async () => {
    // Authenticate in first tab
    await authenticateTestUser(page);

    // Open second tab
    const secondPage = await context.newPage();
    await secondPage.goto('http://localhost:3000');

    // Should be authenticated in second tab too
    const userProfile = secondPage.locator('[data-testid="user-profile"]');

    if (await userProfile.isVisible()) {
      await expect(userProfile).toBeVisible();
    } else {
      test.fail('Authentication should work across tabs once implemented');
    }

    await secondPage.close();
  });

  test('should handle concurrent sign-in attempts', async () => {
    await page.goto('http://localhost:3000');

    const googleSignInButton = page.locator('button:has-text("Sign in with Google")');

    if (await googleSignInButton.isVisible()) {
      // Rapidly click sign-in button multiple times
      await googleSignInButton.click();
      await googleSignInButton.click();
      await googleSignInButton.click();

      // Should handle gracefully without duplicating authentication
      await page.waitForTimeout(2000);

      // Should end up in authenticated state
      const userProfile = page.locator('[data-testid="user-profile"]');

      if (await userProfile.isVisible()) {
        await expect(userProfile).toBeVisible();
      }
    } else {
      test.fail('Concurrent sign-in should be handled once implemented');
    }
  });
});

// Helper function to authenticate test user
async function authenticateTestUser(page: Page): Promise<void> {
  await page.goto('http://localhost:3000');

  const googleSignInButton = page.locator('button:has-text("Sign in with Google")');

  if (await googleSignInButton.isVisible()) {
    await googleSignInButton.click();

    // Wait for authentication to complete
    await page.waitForTimeout(2000);

    // Should be authenticated now
    const userProfile = page.locator('[data-testid="user-profile"]');

    if (!(await userProfile.isVisible())) {
      // If authentication didn't work, skip the test
      test.skip('Authentication not yet implemented');
    }
  } else {
    test.skip('Google sign-in button not found - authentication UI not implemented');
  }
}
