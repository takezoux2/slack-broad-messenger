import { test, expect } from '@playwright/test';

/**
 * E2E test: Error handling and edge cases
 * Tests various error scenarios and edge cases in the application
 */

test.describe('Error Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate user before each test
    await authenticateUser(page);
    await page.goto('/');
  });

  test('should handle deleted channels gracefully', async ({ page }) => {
    // Create a channel list with mixed valid/deleted channels
    await createChannelListWithDeletedChannels(page);

    // Send message to the list
    await page.click('[data-testid="send-message-button"]');
    await page.selectOption('[data-testid="channel-list-selector"]', {
      label: 'Mixed Channel List',
    });
    await page.fill('[data-testid="message-content"]', 'Test message with deleted channels');
    await page.selectOption('[data-testid="sender-selector"]', { index: 0 });
    await page.click('[data-testid="send-message-submit"]');

    // Wait for completion
    await expect(page.locator('text=Completed')).toBeVisible({ timeout: 30000 });

    // Verify delivery report shows skipped channels
    await expect(page.locator('[data-testid="delivery-summary"]')).toBeVisible();
    await expect(page.locator('text=2 skipped')).toBeVisible();

    // Check individual delivery statuses
    await expect(page.locator('[data-testid="delivery-status-skipped"]')).toHaveCount(2);
    await expect(page.locator('text=Channel was deleted')).toBeVisible();
  });

  test('should handle archived channels with warning', async ({ page }) => {
    // Create channel list with archived channels
    await createChannelListWithArchivedChannels(page);

    // Send message should show warning about archived channels
    await page.click('[data-testid="send-message-button"]');
    await page.selectOption('[data-testid="channel-list-selector"]', {
      label: 'Archived Channel List',
    });

    // Should show warning message
    await expect(page.locator('text=Warning: This list contains archived channels')).toBeVisible();
    await expect(page.locator('text=2 archived channels')).toBeVisible();

    // Continue with sending
    await page.fill('[data-testid="message-content"]', 'Test message to archived channels');
    await page.selectOption('[data-testid="sender-selector"]', { index: 0 });
    await page.click('[data-testid="send-message-submit"]');

    // Should complete with failures for archived channels
    await expect(page.locator('text=Completed')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('text=2 failed')).toBeVisible();
    await expect(page.locator('text=Channel is archived')).toBeVisible();
  });

  test('should handle permission denied errors', async ({ page }) => {
    // Create channel list with restricted channels
    await createChannelListWithRestrictedChannels(page);

    // Send message
    await page.click('[data-testid="send-message-button"]');
    await page.selectOption('[data-testid="channel-list-selector"]', {
      label: 'Restricted Channel List',
    });
    await page.fill('[data-testid="message-content"]', 'Test message with permission issues');
    await page.selectOption('[data-testid="sender-selector"]', { index: 0 });
    await page.click('[data-testid="send-message-submit"]');

    // Should complete with permission errors
    await expect(page.locator('text=Completed')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('text=1 failed')).toBeVisible();
    await expect(page.locator('text=Permission denied')).toBeVisible();
  });

  test('should handle Slack API rate limiting', async ({ page }) => {
    // Create large channel list to trigger rate limiting
    await createLargeChannelList(page, 20);

    // Send message that will hit rate limits
    await page.click('[data-testid="send-message-button"]');
    await page.selectOption('[data-testid="channel-list-selector"]', {
      label: 'Large Channel List',
    });
    await page.fill('[data-testid="message-content"]', 'Rate limit test message');
    await page.selectOption('[data-testid="sender-selector"]', { index: 0 });
    await page.click('[data-testid="send-message-submit"]');

    // Should show rate limiting message
    await expect(page.locator('text=Rate limited')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Slowing down to respect API limits')).toBeVisible();

    // Should eventually complete successfully
    await expect(page.locator('text=Completed')).toBeVisible({ timeout: 120000 });
    await expect(page.locator('text=20 successful')).toBeVisible();
  });

  test('should handle network connectivity issues', async ({ page }) => {
    // Create channel list
    await createTestChannelList(page, 'Network Test List', 3);

    // Start sending message
    await page.click('[data-testid="send-message-button"]');
    await page.selectOption('[data-testid="channel-list-selector"]', {
      label: 'Network Test List',
    });
    await page.fill('[data-testid="message-content"]', 'Network connectivity test');
    await page.selectOption('[data-testid="sender-selector"]', { index: 0 });

    // Go offline before sending
    await page.context().setOffline(true);
    await page.click('[data-testid="send-message-submit"]');

    // Should show network error
    await expect(page.locator('text=Network error')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Please check your internet connection')).toBeVisible();

    // Retry button should be available
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Go back online and retry
    await page.context().setOffline(false);
    await page.click('[data-testid="retry-button"]');

    // Should now succeed
    await expect(page.locator('text=Completed')).toBeVisible({ timeout: 30000 });
  });

  test('should handle invalid authentication token', async ({ page }) => {
    // Invalidate the auth token
    await page.evaluate(() => {
      localStorage.setItem(
        'firebase_auth_token',
        JSON.stringify({
          token: 'invalid_token',
          expiresAt: Date.now() + 3600000,
          user: null,
        })
      );
    });

    // Try to access protected content
    await page.reload();

    // Should redirect to auth page
    await expect(page).toHaveURL(/\/auth/);
    await expect(page.locator('text=Session expired')).toBeVisible();
    await expect(page.locator('text=Please sign in again')).toBeVisible();
  });

  test('should handle malformed channel list data', async ({ page }) => {
    // Inject malformed channel list data
    await page.evaluate(() => {
      // Mock corrupted Firestore data
      (window as any).__FIRESTORE_MOCK_DATA__ = {
        channelLists: [
          {
            id: 'corrupted_list',
            name: null, // Invalid name
            channelIds: 'not_an_array', // Invalid channelIds
            channelCount: -1, // Invalid count
          },
        ],
      };
    });

    await page.reload();

    // Should show error message about corrupted data
    await expect(page.locator('text=Error loading channel lists')).toBeVisible();
    await expect(page.locator('text=Some data may be corrupted')).toBeVisible();

    // Should still allow creating new channel lists
    await page.click('[data-testid="create-channel-list-button"]');
    await expect(page.locator('[data-testid="channel-list-form"]')).toBeVisible();
  });

  test('should handle quota exceeded errors', async ({ page }) => {
    // Mock quota exceeded scenario
    await page.route('**/api/messages', route => {
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'QUOTA_EXCEEDED',
          message: 'Daily message quota exceeded',
        }),
      });
    });

    // Try to send message
    await createTestChannelList(page, 'Quota Test List', 2);
    await page.click('[data-testid="send-message-button"]');
    await page.selectOption('[data-testid="channel-list-selector"]', { label: 'Quota Test List' });
    await page.fill('[data-testid="message-content"]', 'Quota test message');
    await page.selectOption('[data-testid="sender-selector"]', { index: 0 });
    await page.click('[data-testid="send-message-submit"]');

    // Should show quota error
    await expect(page.locator('text=Daily quota exceeded')).toBeVisible();
    await expect(page.locator('text=Please try again tomorrow')).toBeVisible();

    // Send button should be disabled
    await expect(page.locator('[data-testid="send-message-submit"]')).toBeDisabled();
  });

  test('should handle extremely long messages', async ({ page }) => {
    // Create channel list
    await createTestChannelList(page, 'Long Message Test', 1);

    // Try to send message that exceeds Slack limit
    await page.click('[data-testid="send-message-button"]');
    await page.selectOption('[data-testid="channel-list-selector"]', {
      label: 'Long Message Test',
    });

    // Fill with very long message
    const longMessage = 'A'.repeat(4001);
    await page.fill('[data-testid="message-content"]', longMessage);

    // Should show character count warning
    await expect(page.locator('text=4001/4000')).toBeVisible();
    await expect(page.locator('text=Message too long')).toBeVisible();

    // Send button should be disabled
    await expect(page.locator('[data-testid="send-message-submit"]')).toBeDisabled();

    // Reduce message length
    const validMessage = 'A'.repeat(4000);
    await page.fill('[data-testid="message-content"]', validMessage);

    // Should now be valid
    await expect(page.locator('text=4000/4000')).toBeVisible();
    await expect(page.locator('[data-testid="send-message-submit"]')).not.toBeDisabled();
  });

  test('should handle partial network failures during batch sending', async ({ page }) => {
    // Create channel list
    await createTestChannelList(page, 'Partial Failure Test', 5);

    // Mock intermittent network failures
    let requestCount = 0;
    await page.route('**/chat.postMessage', route => {
      requestCount++;
      if (requestCount % 2 === 0) {
        // Fail every second request
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'NETWORK_ERROR',
            message: 'Temporary network error',
          }),
        });
      } else {
        route.continue();
      }
    });

    // Send message
    await page.click('[data-testid="send-message-button"]');
    await page.selectOption('[data-testid="channel-list-selector"]', {
      label: 'Partial Failure Test',
    });
    await page.fill('[data-testid="message-content"]', 'Partial failure test');
    await page.selectOption('[data-testid="sender-selector"]', { index: 0 });
    await page.click('[data-testid="send-message-submit"]');

    // Should show mixed results
    await expect(page.locator('text=Completed')).toBeVisible({ timeout: 30000 });

    // Should have both successes and failures
    await expect(page.locator('[data-testid="delivery-status-success"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="delivery-status-failed"]').first()).toBeVisible();

    // Should show retry option for failed messages
    await expect(page.locator('[data-testid="retry-failed-button"]')).toBeVisible();
  });

  test('should handle browser storage quota exceeded', async ({ page }) => {
    // Fill up localStorage to simulate quota exceeded
    await page.evaluate(() => {
      try {
        const bigData = 'x'.repeat(5 * 1024 * 1024); // 5MB of data
        for (let i = 0; i < 100; i++) {
          localStorage.setItem(`big_data_${i}`, bigData);
        }
      } catch (e) {
        // Expected to fail when quota is reached
      }
    });

    // Try to create channel list (which saves to localStorage)
    await page.click('[data-testid="create-channel-list-button"]');
    await page.fill('[data-testid="channel-list-name"]', 'Storage Test List');
    await page.click('[data-testid="channel-picker-trigger"]');
    await page.locator('[data-testid="channel-option"]').first().click();
    await page.click('[data-testid="save-channel-list-button"]');

    // Should show storage quota error
    await expect(page.locator('text=Storage quota exceeded')).toBeVisible();
    await expect(page.locator('text=Please clear some data')).toBeVisible();

    // Should offer to clear cache
    await expect(page.locator('[data-testid="clear-cache-button"]')).toBeVisible();
  });
});

/**
 * Helper functions
 */

async function authenticateUser(page: any) {
  await page.evaluate(() => {
    const mockUser = {
      uid: 'test_user_id',
      email: 'test@example.com',
      displayName: 'Test User',
      slackUserId: 'U123456789',
      slackTeamId: 'T123456789',
    };

    (window as any).__FIREBASE_AUTH_MOCK__ = {
      currentUser: mockUser,
      isAuthenticated: true,
    };

    localStorage.setItem(
      'firebase_auth_token',
      JSON.stringify({
        token: 'mock_token',
        expiresAt: Date.now() + 3600000,
        user: mockUser,
      })
    );
  });
}

async function createTestChannelList(page: any, name: string, channelCount: number) {
  await page.click('[data-testid="create-channel-list-button"]');
  await page.fill('[data-testid="channel-list-name"]', name);

  await page.click('[data-testid="channel-picker-trigger"]');

  for (let i = 0; i < channelCount; i++) {
    await page.locator('[data-testid="channel-option"]').nth(i).click();
  }

  await page.click('[data-testid="save-channel-list-button"]');
  await expect(page.locator(`text=${name}`)).toBeVisible();
}

async function createChannelListWithDeletedChannels(page: any) {
  await page.evaluate(() => {
    // Mock channel data with deleted channels
    (window as any).__CHANNEL_MOCK_DATA__ = [
      { id: 'C1', name: 'general', isDeleted: false },
      { id: 'C2', name: 'deleted-1', isDeleted: true },
      { id: 'C3', name: 'random', isDeleted: false },
      { id: 'C4', name: 'deleted-2', isDeleted: true },
    ];
  });

  await createTestChannelList(page, 'Mixed Channel List', 4);
}

async function createChannelListWithArchivedChannels(page: any) {
  await page.evaluate(() => {
    (window as any).__CHANNEL_MOCK_DATA__ = [
      { id: 'C1', name: 'general', isArchived: false },
      { id: 'C2', name: 'archived-1', isArchived: true },
      { id: 'C3', name: 'archived-2', isArchived: true },
    ];
  });

  await createTestChannelList(page, 'Archived Channel List', 3);
}

async function createChannelListWithRestrictedChannels(page: any) {
  await page.evaluate(() => {
    (window as any).__CHANNEL_MOCK_DATA__ = [
      { id: 'C1', name: 'general', hasPermission: true },
      { id: 'C2', name: 'restricted', hasPermission: false },
    ];
  });

  await createTestChannelList(page, 'Restricted Channel List', 2);
}

async function createLargeChannelList(page: any, size: number) {
  await page.evaluate((size: number) => {
    const channels = [];
    for (let i = 1; i <= size; i++) {
      channels.push({
        id: `C${i.toString().padStart(3, '0')}`,
        name: `channel-${i}`,
        isDeleted: false,
        isArchived: false,
        hasPermission: true,
      });
    }
    (window as any).__CHANNEL_MOCK_DATA__ = channels;
  }, size);

  await createTestChannelList(page, 'Large Channel List', size);
}
