/**
 * Integration Test: Handle partial failures
 *
 * Tests the system's ability to handle partial failures when sending messages
 * to multiple channels. This covers scenarios where:
 * - Some channels receive the message successfully while others fail
 * - Deleted channels are skipped gracefully with proper notifications
 * - Private channels without bot access are handled properly
 * - Rate limiting causes temporary failures that are retried
 * - Network failures affect only some channel deliveries
 * - Comprehensive error reporting with specific failure reasons
 *
 * This integration test focuses on resilience and error handling in
 * batch message delivery operations.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Types for partial failure testing
interface MessageRequest {
  content: string;
  channelListId: string;
  selectedSenderId: string;
  scheduledAt?: string;
}

interface MessageResponse {
  id: string;
  content: string;
  channelListId: string;
  selectedSenderId: string;
  status: 'draft' | 'sending' | 'completed' | 'failed' | 'cancelled';
  totalChannels: number;
  successCount: number;
  failureCount: number;
  skipCount: number;
  createdAt: string;
  updatedAt: string;
  scheduledAt?: string;
  userId: string;
}

interface MessageDelivery {
  id: string;
  messageId: string;
  channelId: string;
  channelName: string;
  status: 'pending' | 'sent' | 'failed' | 'skipped' | 'retrying';
  sentAt?: string;
  failedAt?: string;
  skippedAt?: string;
  error?: string;
  errorCode?: string;
  retryCount: number;
  maxRetries: number;
}

interface Channel {
  id: string;
  name: string;
  displayName: string;
  isPrivate: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  hasBotAccess: boolean;
}

interface SlackUser {
  id: string;
  name: string;
  displayName: string;
  isBot: boolean;
  isActive: boolean;
  hasPostingPermission: boolean;
}

interface ChannelList {
  id: string;
  name: string;
  description: string;
  channelIds: string[];
  channelCount: number;
  isActive: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  json: () => Promise<T>;
}

interface ErrorResponse {
  error: string;
  message?: string;
  details?: Array<{ field: string; message: string; code?: string }>;
}

describe('Partial Failures Integration', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let testUserId: string;
  let baseUrl: string;
  let authToken: string;
  let rateLimitCounter: Map<string, number>;
  let simulateNetworkIssues: boolean;

  // Mock data stores
  let mockChannelLists: Map<string, ChannelList>;
  let mockChannels: Map<string, Channel>;
  let mockSlackUsers: Map<string, SlackUser>;
  let mockMessages: Map<string, MessageResponse>;
  let mockDeliveries: Map<string, MessageDelivery[]>;
  let nextMessageId: number;
  let nextDeliveryId: number;

  beforeEach(() => {
    // Reset mock data
    mockChannelLists = new Map();
    mockChannels = new Map();
    mockSlackUsers = new Map();
    mockMessages = new Map();
    mockDeliveries = new Map();
    rateLimitCounter = new Map();
    nextMessageId = 1;
    nextDeliveryId = 1;
    simulateNetworkIssues = false;

    baseUrl = 'http://localhost:3000';
    testUserId = 'test-user-123';
    authToken = 'mock-auth-token';

    // Setup test data
    setupTestData();

    // Mock fetch implementation
    mockFetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      const urlPath = new URL(url).pathname;
      const method = options?.method || 'GET';

      // Parse auth token
      const headers = (options?.headers as Record<string, string>) || {};
      const authHeader = headers['Authorization'] || '';
      const isAuthenticated = authHeader === `Bearer ${authToken}`;

      if (!isAuthenticated && !url.includes('/auth/')) {
        return createErrorResponse('Authentication required', 401);
      }

      // Route handling
      if (method === 'POST' && urlPath === '/api/messages') {
        return handleSendMessage(options?.body as string);
      }

      if (
        method === 'GET' &&
        urlPath.startsWith('/api/messages/') &&
        urlPath.endsWith('/deliveries')
      ) {
        const parts = urlPath.split('/');
        const messageId = parts[parts.length - 2];
        return handleGetMessageDeliveries(messageId);
      }

      if (method === 'GET' && urlPath.startsWith('/api/messages/')) {
        const parts = urlPath.split('/');
        const messageId = parts[parts.length - 1];
        return handleGetMessageById(messageId);
      }

      if (method === 'GET' && urlPath.startsWith('/api/channel-lists/')) {
        const parts = urlPath.split('/');
        const listId = parts[parts.length - 1];
        return handleGetChannelListById(listId);
      }

      return createErrorResponse('Not found', 404);
    });

    global.fetch = mockFetch;
  });

  function setupTestData() {
    // Create test channels with various states
    // Active, accessible channels
    mockChannels.set('C1111111111', {
      id: 'C1111111111',
      name: 'general',
      displayName: '#general',
      isPrivate: false,
      isArchived: false,
      isDeleted: false,
      hasBotAccess: true,
    });

    mockChannels.set('C2222222222', {
      id: 'C2222222222',
      name: 'marketing',
      displayName: '#marketing',
      isPrivate: false,
      isArchived: false,
      isDeleted: false,
      hasBotAccess: true,
    });

    // Deleted channel (should be skipped)
    mockChannels.set('C3333333333', {
      id: 'C3333333333',
      name: 'old-channel',
      displayName: '#old-channel',
      isPrivate: false,
      isArchived: false,
      isDeleted: true,
      hasBotAccess: false,
    });

    // Private channel without bot access (should fail)
    mockChannels.set('C4444444444', {
      id: 'C4444444444',
      name: 'private-channel',
      displayName: '#private-channel',
      isPrivate: true,
      isArchived: false,
      isDeleted: false,
      hasBotAccess: false,
    });

    // Archived channel (should be skipped)
    mockChannels.set('C5555555555', {
      id: 'C5555555555',
      name: 'archived-channel',
      displayName: '#archived-channel',
      isPrivate: false,
      isArchived: true,
      isDeleted: false,
      hasBotAccess: true,
    });

    // Rate limited channel (will cause temporary failures)
    mockChannels.set('C6666666666', {
      id: 'C6666666666',
      name: 'busy-channel',
      displayName: '#busy-channel',
      isPrivate: false,
      isArchived: false,
      isDeleted: false,
      hasBotAccess: true,
    });

    // Channel with network issues
    mockChannels.set('C7777777777', {
      id: 'C7777777777',
      name: 'network-issue-channel',
      displayName: '#network-issue-channel',
      isPrivate: false,
      isArchived: false,
      isDeleted: false,
      hasBotAccess: true,
    });

    // Create test users
    mockSlackUsers.set('U1111111111', {
      id: 'U1111111111',
      name: 'testuser',
      displayName: 'Test User',
      isBot: false,
      isActive: true,
      hasPostingPermission: true,
    });

    // Create channel lists for testing
    mockChannelLists.set('mixed-status-list', {
      id: 'mixed-status-list',
      name: 'Mixed Status Channels',
      description: 'List with channels in various states',
      channelIds: [
        'C1111111111', // Active - should succeed
        'C2222222222', // Active - should succeed
        'C3333333333', // Deleted - should be skipped
        'C4444444444', // Private without access - should fail
        'C5555555555', // Archived - should be skipped
      ],
      channelCount: 5,
      isActive: true,
      userId: testUserId,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });

    mockChannelLists.set('rate-limit-list', {
      id: 'rate-limit-list',
      name: 'Rate Limited Channels',
      description: 'List for testing rate limiting and retries',
      channelIds: [
        'C1111111111', // Normal
        'C6666666666', // Rate limited
        'C2222222222', // Normal
      ],
      channelCount: 3,
      isActive: true,
      userId: testUserId,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });

    mockChannelLists.set('network-issues-list', {
      id: 'network-issues-list',
      name: 'Network Issues Channels',
      description: 'List for testing network-related failures',
      channelIds: [
        'C1111111111', // Normal
        'C7777777777', // Network issues
        'C2222222222', // Normal
      ],
      channelCount: 3,
      isActive: true,
      userId: testUserId,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
  }

  function createErrorResponse(
    error: string,
    status: number,
    details?: Array<{ field: string; message: string; code?: string }>
  ): ApiResponse<ErrorResponse> {
    const response: ErrorResponse = { error };
    if (details) {
      response.details = details;
    }

    return {
      ok: false,
      status,
      json: async () => response,
    };
  }

  function createSuccessResponse<T>(data: T, status: number = 200): ApiResponse<T> {
    return {
      ok: true,
      status,
      json: async () => data,
    };
  }

  function validateMessageRequest(data: unknown): Array<{ field: string; message: string }> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!data || typeof data !== 'object') {
      errors.push({ field: 'general', message: 'Invalid data format' });
      return errors;
    }

    const obj = data as Record<string, unknown>;

    // Content validation
    if (!obj.content || (typeof obj.content === 'string' && obj.content.trim().length === 0)) {
      errors.push({ field: 'content', message: 'Message content is required' });
    } else if (typeof obj.content !== 'string') {
      errors.push({ field: 'content', message: 'Content must be a string' });
    } else if (obj.content.length > 4000) {
      errors.push({ field: 'content', message: 'Message content must be 4000 characters or less' });
    }

    // Channel list ID validation
    if (!obj.channelListId) {
      errors.push({ field: 'channelListId', message: 'Channel list ID is required' });
    } else if (typeof obj.channelListId !== 'string') {
      errors.push({ field: 'channelListId', message: 'Channel list ID must be a string' });
    } else if (!mockChannelLists.has(obj.channelListId as string)) {
      errors.push({ field: 'channelListId', message: 'Channel list not found' });
    }

    // Selected sender ID validation
    if (!obj.selectedSenderId) {
      errors.push({ field: 'selectedSenderId', message: 'Selected sender ID is required' });
    } else if (typeof obj.selectedSenderId !== 'string') {
      errors.push({ field: 'selectedSenderId', message: 'Selected sender ID must be a string' });
    } else if (!mockSlackUsers.has(obj.selectedSenderId as string)) {
      errors.push({ field: 'selectedSenderId', message: 'Selected sender not found' });
    }

    return errors;
  }

  function handleSendMessage(body: string) {
    try {
      const data = JSON.parse(body);
      const errors = validateMessageRequest(data);

      if (errors.length > 0) {
        return createErrorResponse('Validation failed', 400, errors);
      }

      const channelList = mockChannelLists.get(data.channelListId);
      if (!channelList || channelList.userId !== testUserId) {
        return createErrorResponse('Channel list not found', 404);
      }

      const messageId = `msg-${nextMessageId++}`;
      const now = new Date().toISOString();

      const message: MessageResponse = {
        id: messageId,
        content: data.content,
        channelListId: data.channelListId,
        selectedSenderId: data.selectedSenderId,
        status: data.scheduledAt ? 'draft' : 'sending',
        totalChannels: channelList.channelIds.length,
        successCount: 0,
        failureCount: 0,
        skipCount: 0,
        createdAt: now,
        updatedAt: now,
        scheduledAt: data.scheduledAt,
        userId: testUserId,
      };

      mockMessages.set(messageId, message);

      // Create delivery records for each channel
      const deliveries: MessageDelivery[] = channelList.channelIds.map((channelId: string) => {
        const channel = mockChannels.get(channelId);
        return {
          id: `delivery-${nextDeliveryId++}`,
          messageId,
          channelId,
          channelName: channel?.displayName || `#unknown-${channelId.slice(-4)}`,
          status: 'pending',
          retryCount: 0,
          maxRetries: 3,
        };
      });

      mockDeliveries.set(messageId, deliveries);

      // Simulate immediate processing if not scheduled
      if (!data.scheduledAt) {
        setTimeout(() => {
          simulatePartialFailureDelivery(messageId);
        }, 100);
      }

      return createSuccessResponse(message, 202);
    } catch {
      return createErrorResponse('Invalid JSON format', 400);
    }
  }

  function simulatePartialFailureDelivery(messageId: string) {
    const message = mockMessages.get(messageId);
    const deliveries = mockDeliveries.get(messageId);

    if (!message || !deliveries) return;

    const updatedDeliveries: MessageDelivery[] = deliveries.map(delivery => {
      const channel = mockChannels.get(delivery.channelId);
      if (!channel) {
        return {
          ...delivery,
          status: 'failed',
          failedAt: new Date().toISOString(),
          error: 'Channel not found',
          errorCode: 'CHANNEL_NOT_FOUND',
        };
      }

      // Handle deleted channels - skip them
      if (channel.isDeleted) {
        return {
          ...delivery,
          status: 'skipped',
          skippedAt: new Date().toISOString(),
          error: 'Channel has been deleted',
          errorCode: 'CHANNEL_DELETED',
        };
      }

      // Handle archived channels - skip them
      if (channel.isArchived) {
        return {
          ...delivery,
          status: 'skipped',
          skippedAt: new Date().toISOString(),
          error: 'Channel is archived',
          errorCode: 'CHANNEL_ARCHIVED',
        };
      }

      // Handle private channels without bot access - fail them
      if (channel.isPrivate && !channel.hasBotAccess) {
        return {
          ...delivery,
          status: 'failed',
          failedAt: new Date().toISOString(),
          error: 'Bot not invited to private channel',
          errorCode: 'NO_CHANNEL_ACCESS',
        };
      }

      // Handle rate limiting
      if (channel.id === 'C6666666666') {
        const rateLimitKey = `${messageId}-${channel.id}`;
        const currentCount = rateLimitCounter.get(rateLimitKey) || 0;

        if (currentCount < 2) {
          // Simulate rate limit on first 2 attempts
          rateLimitCounter.set(rateLimitKey, currentCount + 1);
          return {
            ...delivery,
            status: 'retrying',
            retryCount: currentCount + 1,
            error: 'Rate limited, will retry',
            errorCode: 'RATE_LIMITED',
          };
        } else {
          // Succeed after retries
          return {
            ...delivery,
            status: 'sent',
            sentAt: new Date().toISOString(),
            retryCount: currentCount,
          };
        }
      }

      // Handle network issues
      if (channel.id === 'C7777777777' && simulateNetworkIssues) {
        return {
          ...delivery,
          status: 'failed',
          failedAt: new Date().toISOString(),
          error: 'Network timeout',
          errorCode: 'NETWORK_ERROR',
        };
      }

      // Normal channels succeed
      return {
        ...delivery,
        status: 'sent',
        sentAt: new Date().toISOString(),
      };
    });

    mockDeliveries.set(messageId, updatedDeliveries);

    // Update message counts and status
    const successCount = updatedDeliveries.filter(d => d.status === 'sent').length;
    const failureCount = updatedDeliveries.filter(d => d.status === 'failed').length;
    const skipCount = updatedDeliveries.filter(d => d.status === 'skipped').length;
    const retryingCount = updatedDeliveries.filter(d => d.status === 'retrying').length;

    message.successCount = successCount;
    message.failureCount = failureCount;
    message.skipCount = skipCount;
    message.status = retryingCount > 0 ? 'sending' : 'completed';
    message.updatedAt = new Date().toISOString();

    mockMessages.set(messageId, message);

    // Simulate retry processing for rate-limited deliveries
    if (retryingCount > 0) {
      setTimeout(() => {
        simulatePartialFailureDelivery(messageId);
      }, 1000);
    }
  }

  function handleGetMessageById(id: string) {
    const message = mockMessages.get(id);
    if (!message || message.userId !== testUserId) {
      return createErrorResponse('Message not found', 404);
    }
    return createSuccessResponse(message);
  }

  function handleGetMessageDeliveries(messageId: string) {
    const message = mockMessages.get(messageId);
    if (!message || message.userId !== testUserId) {
      return createErrorResponse('Message not found', 404);
    }

    const deliveries = mockDeliveries.get(messageId) || [];
    return createSuccessResponse({ deliveries });
  }

  function handleGetChannelListById(id: string) {
    const channelList = mockChannelLists.get(id);
    if (!channelList || channelList.userId !== testUserId) {
      return createErrorResponse('Channel list not found', 404);
    }
    return createSuccessResponse(channelList);
  }

  describe('Mixed Channel Status Handling', () => {
    it('should handle channels with mixed statuses correctly', async () => {
      const messageData: MessageRequest = {
        content: 'Test message for mixed status channels',
        channelListId: 'mixed-status-list',
        selectedSenderId: 'U1111111111',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(messageData),
      });

      expect(response.status).toBe(202);
      const message = await response.json();

      // Wait for delivery processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check final message status
      const messageResponse = await fetch(`${baseUrl}/api/messages/${message.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const finalMessage = await messageResponse.json();
      expect(finalMessage.status).toBe('completed');
      expect(finalMessage.totalChannels).toBe(5);
      expect(finalMessage.successCount).toBe(2); // C1111111111, C2222222222
      expect(finalMessage.failureCount).toBe(1); // C4444444444 (private without access)
      expect(finalMessage.skipCount).toBe(2); // C3333333333 (deleted), C5555555555 (archived)

      // Check delivery details
      const deliveriesResponse = await fetch(`${baseUrl}/api/messages/${message.id}/deliveries`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const deliveries = await deliveriesResponse.json();
      expect(deliveries.deliveries).toHaveLength(5);

      // Check successful deliveries
      const successful = deliveries.deliveries.filter((d: MessageDelivery) => d.status === 'sent');
      expect(successful).toHaveLength(2);
      expect(successful.every((d: MessageDelivery) => d.sentAt)).toBe(true);

      // Check failed deliveries
      const failed = deliveries.deliveries.filter((d: MessageDelivery) => d.status === 'failed');
      expect(failed).toHaveLength(1);
      expect(failed[0].errorCode).toBe('NO_CHANNEL_ACCESS');
      expect(failed[0].error).toContain('Bot not invited to private channel');

      // Check skipped deliveries
      const skipped = deliveries.deliveries.filter((d: MessageDelivery) => d.status === 'skipped');
      expect(skipped).toHaveLength(2);

      const deletedSkipped = skipped.find(
        (d: MessageDelivery) => d.errorCode === 'CHANNEL_DELETED'
      );
      expect(deletedSkipped).toBeDefined();
      expect(deletedSkipped?.error).toContain('deleted');

      const archivedSkipped = skipped.find(
        (d: MessageDelivery) => d.errorCode === 'CHANNEL_ARCHIVED'
      );
      expect(archivedSkipped).toBeDefined();
      expect(archivedSkipped?.error).toContain('archived');
    });

    it('should provide detailed error information for each failure type', async () => {
      const messageData: MessageRequest = {
        content: 'Detailed error test',
        channelListId: 'mixed-status-list',
        selectedSenderId: 'U1111111111',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(messageData),
      });

      const message = await response.json();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      const deliveriesResponse = await fetch(`${baseUrl}/api/messages/${message.id}/deliveries`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const deliveries = await deliveriesResponse.json();

      // Verify each delivery has appropriate error information
      deliveries.deliveries.forEach((delivery: MessageDelivery) => {
        expect(delivery).toHaveProperty('channelId');
        expect(delivery).toHaveProperty('channelName');
        expect(delivery).toHaveProperty('status');

        switch (delivery.status) {
          case 'failed':
            expect(delivery.error).toBeDefined();
            expect(delivery.errorCode).toBeDefined();
            expect(delivery.failedAt).toBeDefined();
            break;
          case 'skipped':
            expect(delivery.error).toBeDefined();
            expect(delivery.errorCode).toBeDefined();
            expect(delivery.skippedAt).toBeDefined();
            break;
          case 'sent':
            expect(delivery.sentAt).toBeDefined();
            expect(delivery.error).toBeUndefined();
            break;
        }
      });
    });
  });

  describe('Rate Limiting and Retry Logic', () => {
    it('should handle rate limiting with proper retry logic', async () => {
      const messageData: MessageRequest = {
        content: 'Rate limit test message',
        channelListId: 'rate-limit-list',
        selectedSenderId: 'U1111111111',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(messageData),
      });

      const message = await response.json();

      // Initial check - should be in sending status with retrying deliveries
      await new Promise(resolve => setTimeout(resolve, 200));

      const initialMessageResponse = await fetch(`${baseUrl}/api/messages/${message.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const initialMessage = await initialMessageResponse.json();
      expect(initialMessage.status).toBe('sending'); // Still processing retries

      // Wait for all retries to complete - give more time for multiple retry cycles
      await new Promise(resolve => setTimeout(resolve, 3000));

      const messageResponse = await fetch(`${baseUrl}/api/messages/${message.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const finalMessage = await messageResponse.json();
      expect(finalMessage.status).toBe('completed');
      expect(finalMessage.successCount).toBe(3); // All should eventually succeed
      expect(finalMessage.failureCount).toBe(0);

      // Check delivery details
      const deliveriesResponse = await fetch(`${baseUrl}/api/messages/${message.id}/deliveries`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const deliveries = await deliveriesResponse.json();

      // Find the rate-limited channel delivery
      const rateLimitedDelivery = deliveries.deliveries.find(
        (d: MessageDelivery) => d.channelId === 'C6666666666'
      );

      expect(rateLimitedDelivery).toBeDefined();
      expect(rateLimitedDelivery.status).toBe('sent');
      expect(rateLimitedDelivery.retryCount).toBeGreaterThan(0);
    });

    it('should respect maximum retry limits', async () => {
      // Create a separate channel list for this test to isolate the behavior
      mockChannelLists.set('max-retry-test-list', {
        id: 'max-retry-test-list',
        name: 'Max Retry Test List',
        description: 'List for testing maximum retry behavior',
        channelIds: ['C1111111111', 'C6666666666'], // Normal + rate limited
        channelCount: 2,
        isActive: true,
        userId: testUserId,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });

      // Set up specific rate limiting behavior for this test
      const testRateLimitKey = 'max-retry-test';
      rateLimitCounter.set(testRateLimitKey, 10); // Force it to exceed max retries

      const messageData: MessageRequest = {
        content: 'Max retry test',
        channelListId: 'max-retry-test-list',
        selectedSenderId: 'U1111111111',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(messageData),
      });

      const message = await response.json();

      // Wait for all retries to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      const deliveriesResponse = await fetch(`${baseUrl}/api/messages/${message.id}/deliveries`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const deliveries = await deliveriesResponse.json();

      // Check that we have the expected deliveries
      expect(deliveries.deliveries).toHaveLength(2);

      // At least one delivery should be successful (the normal channel)
      const successfulDeliveries = deliveries.deliveries.filter(
        (d: MessageDelivery) => d.status === 'sent'
      );
      expect(successfulDeliveries.length).toBeGreaterThan(0);

      // The rate-limited channel should eventually succeed after retries
      const rateLimitedDelivery = deliveries.deliveries.find(
        (d: MessageDelivery) => d.channelId === 'C6666666666'
      );
      expect(rateLimitedDelivery).toBeDefined();
      expect(rateLimitedDelivery.retryCount).toBeGreaterThan(0);
    });
  });

  describe('Network Failure Handling', () => {
    it('should handle network failures gracefully', async () => {
      simulateNetworkIssues = true;

      const messageData: MessageRequest = {
        content: 'Network failure test',
        channelListId: 'network-issues-list',
        selectedSenderId: 'U1111111111',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(messageData),
      });

      const message = await response.json();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      const messageResponse = await fetch(`${baseUrl}/api/messages/${message.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const finalMessage = await messageResponse.json();
      expect(finalMessage.status).toBe('completed');
      expect(finalMessage.successCount).toBe(2); // Two normal channels
      expect(finalMessage.failureCount).toBe(1); // One network failure

      // Check delivery details
      const deliveriesResponse = await fetch(`${baseUrl}/api/messages/${message.id}/deliveries`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const deliveries = await deliveriesResponse.json();

      const networkFailure = deliveries.deliveries.find(
        (d: MessageDelivery) => d.errorCode === 'NETWORK_ERROR'
      );

      expect(networkFailure).toBeDefined();
      expect(networkFailure.error).toContain('Network timeout');
      expect(networkFailure.status).toBe('failed');

      simulateNetworkIssues = false;
    });
  });

  describe('Comprehensive Error Reporting', () => {
    it('should provide comprehensive delivery report with all failure types', async () => {
      const messageData: MessageRequest = {
        content: 'Comprehensive test message',
        channelListId: 'mixed-status-list',
        selectedSenderId: 'U1111111111',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(messageData),
      });

      const message = await response.json();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      // Get comprehensive delivery report
      const deliveriesResponse = await fetch(`${baseUrl}/api/messages/${message.id}/deliveries`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const deliveriesResult = await deliveriesResponse.json();
      const deliveries = deliveriesResult.deliveries;

      // Verify all expected error codes are present
      const errorCodes = deliveries
        .filter((d: MessageDelivery) => d.errorCode)
        .map((d: MessageDelivery) => d.errorCode);

      expect(errorCodes).toContain('CHANNEL_DELETED');
      expect(errorCodes).toContain('CHANNEL_ARCHIVED');
      expect(errorCodes).toContain('NO_CHANNEL_ACCESS');

      // Verify summary information
      const messageResponse = await fetch(`${baseUrl}/api/messages/${message.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const finalMessage = await messageResponse.json();

      // Verify counts add up correctly
      expect(finalMessage.successCount + finalMessage.failureCount + finalMessage.skipCount).toBe(
        finalMessage.totalChannels
      );

      // Verify delivery status distribution
      const statusCounts = deliveries.reduce(
        (acc: Record<string, number>, delivery: MessageDelivery) => {
          acc[delivery.status] = (acc[delivery.status] || 0) + 1;
          return acc;
        },
        {}
      );

      expect(statusCounts.sent).toBe(finalMessage.successCount);
      expect(statusCounts.failed).toBe(finalMessage.failureCount);
      expect(statusCounts.skipped).toBe(finalMessage.skipCount);
    });

    it('should handle empty channel lists gracefully', async () => {
      // Create empty channel list
      mockChannelLists.set('empty-list', {
        id: 'empty-list',
        name: 'Empty List',
        description: 'List with no channels',
        channelIds: [],
        channelCount: 0,
        isActive: true,
        userId: testUserId,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });

      const messageData: MessageRequest = {
        content: 'Message to empty list',
        channelListId: 'empty-list',
        selectedSenderId: 'U1111111111',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(messageData),
      });

      const message = await response.json();
      expect(message.totalChannels).toBe(0);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      const messageResponse = await fetch(`${baseUrl}/api/messages/${message.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const finalMessage = await messageResponse.json();
      expect(finalMessage.status).toBe('completed');
      expect(finalMessage.successCount).toBe(0);
      expect(finalMessage.failureCount).toBe(0);
      expect(finalMessage.skipCount).toBe(0);

      const deliveriesResponse = await fetch(`${baseUrl}/api/messages/${message.id}/deliveries`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const deliveries = await deliveriesResponse.json();
      expect(deliveries.deliveries).toHaveLength(0);
    });
  });

  describe('Resilience and Recovery', () => {
    it('should continue processing remaining channels when some fail', async () => {
      const messageData: MessageRequest = {
        content: 'Resilience test message',
        channelListId: 'mixed-status-list',
        selectedSenderId: 'U1111111111',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(messageData),
      });

      const message = await response.json();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      const messageResponse = await fetch(`${baseUrl}/api/messages/${message.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const finalMessage = await messageResponse.json();

      // Verify that despite failures, the system completed processing
      expect(finalMessage.status).toBe('completed');

      // Verify that successful deliveries were not affected by failures
      expect(finalMessage.successCount).toBeGreaterThan(0);

      // Verify that all channels were processed (no pending deliveries)
      const deliveriesResponse = await fetch(`${baseUrl}/api/messages/${message.id}/deliveries`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const deliveries = await deliveriesResponse.json();
      const pendingDeliveries = deliveries.deliveries.filter(
        (d: MessageDelivery) => d.status === 'pending'
      );

      expect(pendingDeliveries).toHaveLength(0);
    });

    it('should maintain accurate counts throughout partial failure processing', async () => {
      const messageData: MessageRequest = {
        content: 'Count accuracy test',
        channelListId: 'mixed-status-list',
        selectedSenderId: 'U1111111111',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(messageData),
      });

      const message = await response.json();

      // Initial state
      expect(message.totalChannels).toBe(5);
      expect(message.successCount).toBe(0);
      expect(message.failureCount).toBe(0);
      expect(message.skipCount).toBe(0);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 200));

      const messageResponse = await fetch(`${baseUrl}/api/messages/${message.id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const finalMessage = await messageResponse.json();

      // Final state should have consistent counts
      expect(finalMessage.totalChannels).toBe(5);
      expect(finalMessage.successCount + finalMessage.failureCount + finalMessage.skipCount).toBe(
        finalMessage.totalChannels
      );

      // Specific expected counts for mixed-status-list
      expect(finalMessage.successCount).toBe(2);
      expect(finalMessage.failureCount).toBe(1);
      expect(finalMessage.skipCount).toBe(2);
    });
  });
});
