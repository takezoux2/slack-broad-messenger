import { test, expect } from '@playwright/test';

/**
 * E2E test: Create channel list and send message
 * Tests the complete workflow from channel list creation to message sending
 */

test.describe('Message Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate user before each test
    await authenticateUser(page);
    await page.goto('/');
  });

  test('should create a channel list and send a message successfully', async ({ page }) => {
    // Step 1: Create a new channel list
    await page.click('[data-testid="create-channel-list-button"]');

    // Fill in channel list details
    await page.fill('[data-testid="channel-list-name"]', 'Test Marketing Channels');
    await page.fill(
      '[data-testid="channel-list-description"]',
      'Channels for marketing team updates'
    );

    // Select channels from the picker
    await page.click('[data-testid="channel-picker-trigger"]');

    // Wait for channels to load
    const channelOptions = page.locator('[data-testid="channel-option"]');
    await expect(channelOptions.first()).toBeVisible();

    // Select 3 channels
    const channelCount = await channelOptions.count();
    const selectedChannels = Math.min(3, channelCount);

    for (let i = 0; i < selectedChannels; i++) {
      await channelOptions.nth(i).click();
    }

    // Save the channel list
    await page.click('[data-testid="save-channel-list-button"]');

    // Verify channel list was created
    await expect(page.locator('text=Test Marketing Channels')).toBeVisible();
    await expect(page.locator(`text=${selectedChannels} channels`)).toBeVisible();

    // Step 2: Send a message to the channel list
    await page.click('[data-testid="send-message-button"]');

    // Fill in message details
    await page.selectOption('[data-testid="channel-list-selector"]', {
      label: 'Test Marketing Channels',
    });
    await page.fill(
      '[data-testid="message-content"]',
      '🎉 Weekly team update: All projects on track! This is a test message.'
    );

    // Select a sender
    await page.selectOption('[data-testid="sender-selector"]', { index: 0 });

    // Verify message preview
    await expect(page.locator('text=Preview: 3 channels selected')).toBeVisible();
    await expect(page.locator('text=🎉 Weekly team update')).toBeVisible();

    // Send the message
    await page.click('[data-testid="send-message-submit"]');

    // Step 3: Monitor sending progress
    await expect(page.locator('[data-testid="progress-indicator"]')).toBeVisible();
    await expect(page.locator('text=Sending...')).toBeVisible();

    // Wait for sending to complete (with timeout)
    await expect(page.locator('text=Completed')).toBeVisible({ timeout: 30000 });

    // Step 4: Verify delivery report
    await expect(page.locator('[data-testid="delivery-summary"]')).toBeVisible();
    await expect(page.locator('text=3 total')).toBeVisible();

    // Check individual delivery results
    const deliveryRows = page.locator('[data-testid="delivery-row"]');
    await expect(deliveryRows).toHaveCount(selectedChannels);

    // At least one delivery should be successful (in test environment)
    const successfulDeliveries = page.locator('[data-testid="delivery-status-success"]');
    await expect(successfulDeliveries.first()).toBeVisible();
  });

  test('should edit an existing channel list', async ({ page }) => {
    // Create a channel list first
    await createTestChannelList(page, 'Original List', 2);

    // Edit the channel list
    await page.click('[data-testid="edit-channel-list-button"]');

    // Update the name
    await page.fill('[data-testid="channel-list-name"]', 'Updated List Name');

    // Add one more channel
    await page.click('[data-testid="channel-picker-trigger"]');
    const newChannelOption = page.locator('[data-testid="channel-option"]').nth(2);
    await newChannelOption.click();

    // Save changes
    await page.click('[data-testid="save-channel-list-button"]');

    // Verify updates
    await expect(page.locator('text=Updated List Name')).toBeVisible();
    await expect(page.locator('text=3 channels')).toBeVisible();
  });

  test('should delete a channel list', async ({ page }) => {
    // Create a channel list first
    await createTestChannelList(page, 'List to Delete', 1);

    // Delete the channel list
    await page.click('[data-testid="delete-channel-list-button"]');

    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');

    // Verify list is removed
    await expect(page.locator('text=List to Delete')).not.toBeVisible();
    await expect(page.locator('text=No channel lists found')).toBeVisible();
  });

  test('should handle message sending to large channel list', async ({ page }) => {
    // Create a channel list with maximum channels
    await createTestChannelList(page, 'Large Channel List', 10);

    // Send message
    await page.click('[data-testid="send-message-button"]');
    await page.selectOption('[data-testid="channel-list-selector"]', {
      label: 'Large Channel List',
    });
    await page.fill('[data-testid="message-content"]', 'Test message to many channels');
    await page.selectOption('[data-testid="sender-selector"]', { index: 0 });

    // Send the message
    await page.click('[data-testid="send-message-submit"]');

    // Monitor progress with regular updates
    const progressText = page.locator('[data-testid="progress-text"]');

    // Should show progress updates
    await expect(progressText).toContainText('0/10');

    // Wait for completion
    await expect(progressText).toContainText('Completed', { timeout: 60000 });

    // Verify all channels processed
    await expect(page.locator('text=10 total')).toBeVisible();
  });

  test('should show real-time progress updates during sending', async ({ page }) => {
    // Create channel list
    await createTestChannelList(page, 'Progress Test List', 5);

    // Start sending message
    await page.click('[data-testid="send-message-button"]');
    await page.selectOption('[data-testid="channel-list-selector"]', {
      label: 'Progress Test List',
    });
    await page.fill('[data-testid="message-content"]', 'Testing progress updates');
    await page.selectOption('[data-testid="sender-selector"]', { index: 0 });
    await page.click('[data-testid="send-message-submit"]');

    // Monitor progress changes
    const progressBar = page.locator('[data-testid="progress-bar"]');
    const progressPercentage = page.locator('[data-testid="progress-percentage"]');

    // Progress should start at 0%
    await expect(progressPercentage).toContainText('0%');

    // Progress should increase over time
    await expect(progressPercentage).toContainText(/[1-9]/, { timeout: 10000 });

    // Eventually reach 100%
    await expect(progressPercentage).toContainText('100%', { timeout: 30000 });

    // Progress bar should be full
    await expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  test('should handle validation errors gracefully', async ({ page }) => {
    // Try to send message without selecting channel list
    await page.click('[data-testid="send-message-button"]');
    await page.fill('[data-testid="message-content"]', 'Test message');
    await page.click('[data-testid="send-message-submit"]');

    // Should show validation error
    await expect(page.locator('text=Please select a channel list')).toBeVisible();

    // Try to send empty message
    await page.selectOption('[data-testid="channel-list-selector"]', { index: 0 });
    await page.fill('[data-testid="message-content"]', '');
    await page.click('[data-testid="send-message-submit"]');

    // Should show validation error
    await expect(page.locator('text=Message content is required')).toBeVisible();

    // Try to send message that's too long
    const longMessage = 'A'.repeat(4001);
    await page.fill('[data-testid="message-content"]', longMessage);
    await page.click('[data-testid="send-message-submit"]');

    // Should show validation error
    await expect(page.locator('text=Message too long')).toBeVisible();
  });

  test('should display message history', async ({ page }) => {
    // Send a few messages first
    await createTestChannelList(page, 'History Test List', 2);

    for (let i = 1; i <= 3; i++) {
      await sendTestMessage(page, 'History Test List', `Test message ${i}`);
      await page.waitForTimeout(1000); // Small delay between messages
    }

    // Go to message history
    await page.click('[data-testid="message-history-tab"]');

    // Should show all sent messages
    await expect(page.locator('[data-testid="message-row"]')).toHaveCount(3);

    // Messages should be in reverse chronological order
    const messageRows = page.locator('[data-testid="message-row"]');
    await expect(messageRows.nth(0)).toContainText('Test message 3');
    await expect(messageRows.nth(1)).toContainText('Test message 2');
    await expect(messageRows.nth(2)).toContainText('Test message 1');

    // Click on a message to see details
    await messageRows.nth(0).click();

    // Should show delivery details
    await expect(page.locator('[data-testid="message-details"]')).toBeVisible();
    await expect(page.locator('text=Test message 3')).toBeVisible();
    await expect(page.locator('[data-testid="delivery-details"]')).toBeVisible();
  });

  test('should handle network errors during sending', async ({ page }) => {
    // Create channel list
    await createTestChannelList(page, 'Network Test List', 3);

    // Start sending message
    await page.click('[data-testid="send-message-button"]');
    await page.selectOption('[data-testid="channel-list-selector"]', {
      label: 'Network Test List',
    });
    await page.fill('[data-testid="message-content"]', 'Testing network error handling');
    await page.selectOption('[data-testid="sender-selector"]', { index: 0 });

    // Simulate network error by going offline
    await page.context().setOffline(true);

    await page.click('[data-testid="send-message-submit"]');

    // Should show network error
    await expect(page.locator('text=Network error')).toBeVisible({ timeout: 10000 });

    // Go back online
    await page.context().setOffline(false);

    // Should be able to retry
    await page.click('[data-testid="retry-button"]');

    // Should eventually succeed
    await expect(page.locator('text=Completed')).toBeVisible({ timeout: 30000 });
  });
});

/**
 * Helper function to authenticate a user for testing
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

/**
 * Helper function to create a test channel list
 */
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

/**
 * Helper function to send a test message
 */
async function sendTestMessage(page: any, channelListName: string, content: string) {
  await page.click('[data-testid="send-message-button"]');
  await page.selectOption('[data-testid="channel-list-selector"]', { label: channelListName });
  await page.fill('[data-testid="message-content"]', content);
  await page.selectOption('[data-testid="sender-selector"]', { index: 0 });
  await page.click('[data-testid="send-message-submit"]');

  // Wait for completion
  await expect(page.locator('text=Completed')).toBeVisible({ timeout: 30000 });

  // Return to main view
  await page.click('[data-testid="back-to-dashboard"]');
}
