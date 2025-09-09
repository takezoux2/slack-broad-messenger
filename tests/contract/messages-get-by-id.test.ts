import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testClient } from '../setup';

describe('Contract: GET /api/messages/{messageId}', () => {
  beforeAll(async () => {
    // Setup test environment if needed
  });

  afterAll(async () => {
    // Cleanup test environment if needed
  });

  it('should return specific message by ID', async () => {
    const messageId = 'test-message-id-123';
    const response = await testClient.get(`/api/messages/${messageId}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: messageId,
        content: expect.any(String),
        channelListId: expect.any(String),
        userId: expect.any(String),
        status: expect.stringMatching(/^(pending|sending|completed|failed)$/),
        createdAt: expect.any(String),
        scheduledAt: expect.any(String),
        deliveries: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            channelId: expect.any(String),
            channelName: expect.any(String),
            status: expect.stringMatching(/^(pending|sent|failed)$/),
            sentAt: expect.any(String),
            error: expect.any(String),
          }),
        ]),
      })
    );
  });

  it('should require authentication', async () => {
    const messageId = 'test-message-id-123';
    const response = await testClient.get(`/api/messages/${messageId}`);

    expect([401, 403]).toContain(response.status);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('authentication'),
      })
    );
  });

  it('should return 404 for non-existent message', async () => {
    const messageId = 'non-existent-message-id';
    const response = await testClient.get(`/api/messages/${messageId}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('Message not found'),
      })
    );
  });

  it('should return 403 for message belonging to another user', async () => {
    const messageId = 'other-user-message-id';
    const response = await testClient.get(`/api/messages/${messageId}`);

    expect([403, 404]).toContain(response.status);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.any(String),
      })
    );
  });

  it('should include delivery details for each channel', async () => {
    const messageId = 'detailed-message-id';
    const response = await testClient.get(`/api/messages/${messageId}`);

    if (response.status === 200) {
      const body = response.body as {
        deliveries: Array<{
          channelId: string;
          channelName: string;
          status: string;
          sentAt?: string;
          error?: string;
        }>;
      };

      expect(body.deliveries).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            channelId: expect.any(String),
            channelName: expect.any(String),
            status: expect.stringMatching(/^(pending|sent|failed)$/),
          }),
        ])
      );
    }
  });

  it('should validate messageId parameter format', async () => {
    const invalidIds = ['', '   ', 'invalid/id', 'id with spaces'];

    for (const invalidId of invalidIds) {
      const response = await testClient.get(`/api/messages/${encodeURIComponent(invalidId)}`);
      expect([400, 404]).toContain(response.status);
    }
  });
});
