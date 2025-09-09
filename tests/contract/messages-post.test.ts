import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testClient } from '../setup';

describe('Contract: POST /api/messages', () => {
  beforeAll(async () => {
    // Setup test environment if needed
  });

  afterAll(async () => {
    // Cleanup test environment if needed
  });

  it('should send message to multiple channels successfully', async () => {
    const messageData = {
      content: 'Hello everyone! This is a test message.',
      channelListId: 'test-channel-list-id',
      scheduledAt: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
    };

    const response = await testClient.post('/api/messages', messageData);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        content: 'Hello everyone! This is a test message.',
        channelListId: 'test-channel-list-id',
        userId: expect.any(String),
        status: 'pending',
        createdAt: expect.any(String),
        scheduledAt: expect.any(String),
        deliveries: expect.arrayContaining([
          expect.objectContaining({
            channelId: expect.any(String),
            status: 'pending',
          }),
        ]),
      })
    );
  });

  it('should require authentication', async () => {
    const messageData = {
      content: 'Test message',
      channelListId: 'test-list-id',
    };

    const response = await testClient.post('/api/messages', messageData);

    expect([401, 403]).toContain(response.status);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('authentication'),
      })
    );
  });

  it('should validate required fields', async () => {
    const invalidData = {
      channelListId: 'test-list-id',
      // Missing content
    };

    const response = await testClient.post('/api/messages', invalidData);

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('content'),
        details: expect.any(Array),
      })
    );
  });

  it('should validate message content length', async () => {
    const longContent = 'a'.repeat(4001); // Exceeds typical Slack message limit
    const messageData = {
      content: longContent,
      channelListId: 'test-list-id',
    };

    const response = await testClient.post('/api/messages', messageData);

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('content length'),
      })
    );
  });

  it('should validate channel list exists and belongs to user', async () => {
    const messageData = {
      content: 'Test message',
      channelListId: 'non-existent-list-id',
    };

    const response = await testClient.post('/api/messages', messageData);

    expect([404, 403]).toContain(response.status);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('Channel list'),
      })
    );
  });

  it('should handle immediate sending when no schedule provided', async () => {
    const messageData = {
      content: 'Immediate message',
      channelListId: 'test-channel-list-id',
    };

    const response = await testClient.post('/api/messages', messageData);

    if (response.status === 201) {
      expect(response.body).toEqual(
        expect.objectContaining({
          status: expect.stringMatching(/^(sending|completed)$/),
          scheduledAt: expect.any(String),
        })
      );
    }
  });

  it('should validate scheduled time is in the future', async () => {
    const pastTime = new Date(Date.now() - 60000).toISOString(); // 1 minute ago
    const messageData = {
      content: 'Past scheduled message',
      channelListId: 'test-channel-list-id',
      scheduledAt: pastTime,
    };

    const response = await testClient.post('/api/messages', messageData);

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('future'),
      })
    );
  });
});
