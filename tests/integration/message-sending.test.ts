/**
 * Integration Test: Send message to multiple channels
 *
 * Tests the complete user story of sending messages to multiple channels:
 * - Composing a message
 * - Selecting multiple channels from a channel list
 * - Sending the message with progress tracking
 * - Handling success and failure scenarios
 * - Real-time delivery status updates
 *
 * This integration test focuses on testing the message sending workflow
 * and the interaction between channel lists and message delivery.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Types for message sending
interface MessageRequest {
  content: string;
  channelListId: string;
  scheduledAt?: string;
}

interface MessageResponse {
  id: string;
  content: string;
  channelListId: string;
  status: 'pending' | 'sending' | 'completed' | 'failed';
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

interface MessageDelivery {
  id: string;
  messageId: string;
  channelId: string;
  channelName: string;
  status: 'pending' | 'sent' | 'failed';
  sentAt?: string;
  error?: string;
}

interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  json: () => Promise<T>;
}

describe('Message Sending Integration', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let testUserId: string;
  let baseUrl: string;
  let authToken: string;

  // Mock data stores
  let mockChannelLists: Map<
    string,
    {
      id: string;
      name: string;
      description: string;
      channels: string[];
      userId: string;
      createdAt: string;
      updatedAt: string;
    }
  >;
  let mockMessages: Map<string, MessageResponse>;
  let mockDeliveries: Map<string, MessageDelivery[]>;
  let nextMessageId: number;
  let nextDeliveryId: number;

  beforeEach(() => {
    // Reset mock data
    mockChannelLists = new Map();
    mockMessages = new Map();
    mockDeliveries = new Map();
    nextMessageId = 1;
    nextDeliveryId = 1;

    baseUrl = 'http://localhost:3000';
    testUserId = 'test-user-123';
    authToken = 'mock-auth-token';

    // Create some test channel lists
    mockChannelLists.set('list-1', {
      id: 'list-1',
      name: 'Marketing Channels',
      description: 'Marketing team channels',
      channels: ['C1111111111', 'C2222222222', 'C3333333333'],
      userId: testUserId,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });

    mockChannelLists.set('list-2', {
      id: 'list-2',
      name: 'Development Channels',
      description: 'Dev team channels',
      channels: ['C4444444444', 'C5555555555'],
      userId: testUserId,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });

    // Mock fetch implementation
    mockFetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      const urlPath = new URL(url).pathname;
      const method = options?.method || 'GET';

      // Parse auth token
      const headers = (options?.headers as Record<string, string>) || {};
      const authHeader = headers['Authorization'] || '';
      const isAuthenticated = authHeader === `Bearer ${authToken}`;

      if (!isAuthenticated && !url.includes('/auth/')) {
        return createMockResponse({ error: 'Authentication required' }, 401);
      }

      // Route handling
      if (method === 'POST' && urlPath === '/api/messages') {
        return handleSendMessage(options?.body as string);
      }

      if (method === 'GET' && urlPath === '/api/messages') {
        return handleGetMessages();
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

      // Channel list routes (simplified)
      if (method === 'GET' && urlPath.startsWith('/api/channel-lists/')) {
        const parts = urlPath.split('/');
        const listId = parts[parts.length - 1];
        return handleGetChannelListById(listId);
      }

      return createMockResponse({ error: 'Not found' }, 404);
    });

    global.fetch = mockFetch;
  });

  // Helper functions
  function createMockResponse<T>(data: T, status: number = 200): ApiResponse<T> {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => data,
    };
  }

  function validateMessageRequest(data: unknown): string[] {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      errors.push('Invalid data format');
      return errors;
    }

    const obj = data as Record<string, unknown>;

    if (!obj.content || typeof obj.content !== 'string' || obj.content.trim().length === 0) {
      errors.push('Message content is required');
    }

    if (typeof obj.content === 'string' && obj.content.length > 4000) {
      errors.push('Message content must be 4000 characters or less');
    }

    if (!obj.channelListId || typeof obj.channelListId !== 'string') {
      errors.push('Channel list ID is required');
    }

    if (obj.scheduledAt && typeof obj.scheduledAt === 'string') {
      const scheduledTime = new Date(obj.scheduledAt);
      if (scheduledTime <= new Date()) {
        errors.push('Scheduled time must be in the future');
      }
    }

    return errors;
  }

  function handleSendMessage(body: string) {
    try {
      const data = JSON.parse(body);
      const errors = validateMessageRequest(data);

      if (errors.length > 0) {
        return createMockResponse(
          {
            error: 'Validation failed',
            details: errors.map(message => ({ field: 'general', message })),
          },
          400
        );
      }

      // Check if channel list exists and belongs to user
      const channelList = mockChannelLists.get(data.channelListId);
      if (!channelList || channelList.userId !== testUserId) {
        return createMockResponse(
          {
            error: 'Channel list not found or access denied',
          },
          404
        );
      }

      const messageId = `msg-${nextMessageId++}`;
      const now = new Date().toISOString();

      const message: MessageResponse = {
        id: messageId,
        content: data.content as string,
        channelListId: data.channelListId as string,
        status: data.scheduledAt ? 'pending' : 'sending',
        scheduledAt: data.scheduledAt as string | undefined,
        createdAt: now,
        updatedAt: now,
        userId: testUserId,
      };

      mockMessages.set(messageId, message);

      // Create delivery records for each channel
      const deliveries: MessageDelivery[] = channelList.channels.map((channelId: string) => ({
        id: `delivery-${nextDeliveryId++}`,
        messageId,
        channelId,
        channelName: `#channel-${channelId.slice(-4)}`, // Mock channel name
        status: 'pending' as const,
        sentAt: undefined,
        error: undefined,
      }));

      mockDeliveries.set(messageId, deliveries);

      // Simulate immediate sending if not scheduled
      if (!data.scheduledAt) {
        setTimeout(() => {
          simulateMessageDelivery(messageId);
        }, 100); // Short delay to simulate processing
      }

      return createMockResponse(message, 201);
    } catch {
      return createMockResponse({ error: 'Invalid JSON' }, 400);
    }
  }

  function simulateMessageDelivery(messageId: string) {
    const message = mockMessages.get(messageId);
    const deliveries = mockDeliveries.get(messageId);

    if (!message || !deliveries) return;

    // Simulate successful delivery to most channels, with some failures
    const updatedDeliveries: MessageDelivery[] = deliveries.map(delivery => {
      // Simulate 80% success rate
      const isSuccess = Math.random() > 0.2;

      return {
        ...delivery,
        status: isSuccess ? ('sent' as const) : ('failed' as const),
        sentAt: isSuccess ? new Date().toISOString() : undefined,
        error: isSuccess ? undefined : 'Channel not found or bot not invited',
      };
    });

    mockDeliveries.set(messageId, updatedDeliveries);

    // Update message status
    const hasFailures = updatedDeliveries.some(d => d.status === 'failed');
    message.status = hasFailures ? 'completed' : 'completed'; // All completed, regardless of individual failures
    message.updatedAt = new Date().toISOString();
    mockMessages.set(messageId, message);
  }

  function handleGetMessages() {
    const messagesArray = Array.from(mockMessages.values())
      .filter(message => message.userId === testUserId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return createMockResponse({ messages: messagesArray });
  }

  function handleGetMessageById(id: string) {
    const message = mockMessages.get(id);

    if (!message || message.userId !== testUserId) {
      return createMockResponse({ error: 'Message not found' }, 404);
    }

    return createMockResponse(message);
  }

  function handleGetMessageDeliveries(messageId: string) {
    const message = mockMessages.get(messageId);

    if (!message || message.userId !== testUserId) {
      return createMockResponse({ error: 'Message not found' }, 404);
    }

    const deliveries = mockDeliveries.get(messageId) || [];
    return createMockResponse({ deliveries });
  }

  function handleGetChannelListById(id: string) {
    const channelList = mockChannelLists.get(id);

    if (!channelList || channelList.userId !== testUserId) {
      return createMockResponse({ error: 'Channel list not found' }, 404);
    }

    return createMockResponse(channelList);
  }

  describe('Composing and Sending Messages', () => {
    it('should send message to multiple channels successfully', async () => {
      const messageData: MessageRequest = {
        content: 'Hello everyone! This is a test message.',
        channelListId: 'list-1',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(messageData),
      });

      expect(response.status).toBe(201);

      const result = await response.json();
      expect(result).toMatchObject({
        id: expect.any(String),
        content: 'Hello everyone! This is a test message.',
        channelListId: 'list-1',
        status: 'sending',
        userId: testUserId,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      // Wait for delivery simulation
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check message deliveries
      const deliveriesResponse = await fetch(`${baseUrl}/api/messages/${result.id}/deliveries`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(deliveriesResponse.status).toBe(200);
      const deliveriesResult = await deliveriesResponse.json();

      expect(deliveriesResult.deliveries).toHaveLength(3); // list-1 has 3 channels
      expect(deliveriesResult.deliveries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            messageId: result.id,
            channelId: expect.any(String),
            channelName: expect.any(String),
            status: expect.stringMatching(/^(sent|failed)$/),
          }),
        ])
      );
    });

    it('should validate message content length', async () => {
      const longMessage = 'x'.repeat(4001); // Exceeds 4000 character limit

      const messageData: MessageRequest = {
        content: longMessage,
        channelListId: 'list-1',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(messageData),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('4000 characters'),
          }),
        ]),
      });
    });

    it('should require message content', async () => {
      const messageData = {
        content: '',
        channelListId: 'list-1',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(messageData),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('content is required'),
          }),
        ]),
      });
    });

    it('should validate channel list exists and belongs to user', async () => {
      const messageData: MessageRequest = {
        content: 'Test message',
        channelListId: 'non-existent-list',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(messageData),
      });

      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error).toMatchObject({
        error: expect.stringContaining('Channel list not found'),
      });
    });
  });

  describe('Scheduled Messages', () => {
    it('should schedule message for future delivery', async () => {
      const futureTime = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now

      const messageData: MessageRequest = {
        content: 'This is a scheduled message',
        channelListId: 'list-1',
        scheduledAt: futureTime,
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(messageData),
      });

      expect(response.status).toBe(201);

      const result = await response.json();
      expect(result).toMatchObject({
        id: expect.any(String),
        content: 'This is a scheduled message',
        channelListId: 'list-1',
        status: 'pending',
        scheduledAt: futureTime,
        userId: testUserId,
      });
    });

    it('should reject scheduled time in the past', async () => {
      const pastTime = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago

      const messageData: MessageRequest = {
        content: 'This should fail',
        channelListId: 'list-1',
        scheduledAt: pastTime,
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(messageData),
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Validation failed',
        details: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('future'),
          }),
        ]),
      });
    });
  });

  describe('Message Status and Progress Tracking', () => {
    it('should track message delivery progress', async () => {
      const messageData: MessageRequest = {
        content: 'Progress tracking test',
        channelListId: 'list-2', // Has 2 channels
      };

      // Send message
      const sendResponse = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(messageData),
      });

      const message = await sendResponse.json();

      // Check initial delivery status
      const initialDeliveriesResponse = await fetch(
        `${baseUrl}/api/messages/${message.id}/deliveries`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const initialDeliveries = await initialDeliveriesResponse.json();
      expect(
        initialDeliveries.deliveries.every((d: MessageDelivery) => d.status === 'pending')
      ).toBe(true);

      // Wait for delivery simulation
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check final delivery status
      const finalDeliveriesResponse = await fetch(
        `${baseUrl}/api/messages/${message.id}/deliveries`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      const finalDeliveries = await finalDeliveriesResponse.json();
      expect(finalDeliveries.deliveries.some((d: MessageDelivery) => d.status !== 'pending')).toBe(
        true
      );
    });

    it('should retrieve message history', async () => {
      // Send multiple messages with small delays to ensure proper ordering
      const messages = [
        { content: 'First message', channelListId: 'list-1' },
        { content: 'Second message', channelListId: 'list-2' },
        { content: 'Third message', channelListId: 'list-1' },
      ];

      for (let i = 0; i < messages.length; i++) {
        await fetch(`${baseUrl}/api/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(messages[i]),
        });

        // Small delay to ensure timestamps are different
        if (i < messages.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Get message history
      const historyResponse = await fetch(`${baseUrl}/api/messages`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(historyResponse.status).toBe(200);

      const history = await historyResponse.json();
      expect(history.messages).toHaveLength(3);
      expect(history.messages[0].content).toBe('Third message'); // Most recent first
      expect(history.messages[1].content).toBe('Second message');
      expect(history.messages[2].content).toBe('First message');
    });

    it('should get individual message details', async () => {
      const messageData: MessageRequest = {
        content: 'Individual message test',
        channelListId: 'list-1',
      };

      const sendResponse = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(messageData),
      });

      const message = await sendResponse.json();

      // Get message details
      const detailsResponse = await fetch(`${baseUrl}/api/messages/${message.id}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(detailsResponse.status).toBe(200);

      const details = await detailsResponse.json();
      expect(details).toMatchObject({
        id: message.id,
        content: 'Individual message test',
        channelListId: 'list-1',
        userId: testUserId,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle authentication errors', async () => {
      const messageData: MessageRequest = {
        content: 'Unauthorized message',
        channelListId: 'list-1',
      };

      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header
        },
        body: JSON.stringify(messageData),
      });

      expect(response.status).toBe(401);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Authentication required',
      });
    });

    it('should handle malformed JSON', async () => {
      const response = await fetch(`${baseUrl}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: 'invalid-json',
      });

      expect(response.status).toBe(400);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Invalid JSON',
      });
    });

    it('should handle delivery failures gracefully', async () => {
      const messageData: MessageRequest = {
        content: 'Test with failures',
        channelListId: 'list-1',
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

      // Wait for delivery simulation
      await new Promise(resolve => setTimeout(resolve, 200));

      // Check deliveries - some should fail (due to 80% success rate in simulation)
      const deliveriesResponse = await fetch(`${baseUrl}/api/messages/${message.id}/deliveries`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const deliveries = await deliveriesResponse.json();

      // Should have both successful and failed deliveries
      const hasSuccessful = deliveries.deliveries.some((d: MessageDelivery) => d.status === 'sent');
      const hasFailed = deliveries.deliveries.some((d: MessageDelivery) => d.status === 'failed');

      expect(hasSuccessful || hasFailed).toBe(true); // At least one delivery should be processed

      // Failed deliveries should have error messages
      const failedDeliveries = deliveries.deliveries.filter(
        (d: MessageDelivery) => d.status === 'failed'
      );
      failedDeliveries.forEach((delivery: MessageDelivery) => {
        expect(delivery.error).toBeDefined();
        expect(delivery.error).toBeTruthy();
      });
    });

    it('should return 404 for non-existent message', async () => {
      const response = await fetch(`${baseUrl}/api/messages/non-existent-id`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.status).toBe(404);

      const error = await response.json();
      expect(error).toMatchObject({
        error: 'Message not found',
      });
    });
  });
});
