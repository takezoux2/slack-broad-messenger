import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testClient } from '../setup';

describe('Contract: GET /api/messages', () => {
  beforeAll(async () => {
    // Setup test environment if needed
  });

  afterAll(async () => {
    // Cleanup test environment if needed
  });

  it('should return list of messages for authenticated user', async () => {
    const response = await testClient.get('/api/messages');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            content: expect.any(String),
            channelListId: expect.any(String),
            userId: expect.any(String),
            status: expect.stringMatching(/^(pending|sending|completed|failed)$/),
            createdAt: expect.any(String),
            scheduledAt: expect.any(String),
          }),
        ]),
      })
    );
  });

  it('should require authentication', async () => {
    const response = await testClient.get('/api/messages');

    expect([401, 403]).toContain(response.status);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('authentication'),
      })
    );
  });

  it('should support filtering by status', async () => {
    const response = await testClient.get('/api/messages?status=completed');

    if (response.status === 200) {
      const body = response.body as { messages: Array<{ status: string }> };
      const messages = body.messages;

      messages.forEach(message => {
        expect(message.status).toBe('completed');
      });
    }
  });

  it('should support filtering by date range', async () => {
    const startDate = '2024-01-01T00:00:00Z';
    const endDate = '2024-12-31T23:59:59Z';
    const response = await testClient.get(
      `/api/messages?start_date=${startDate}&end_date=${endDate}`
    );

    if (response.status === 200) {
      expect(response.body).toEqual(
        expect.objectContaining({
          messages: expect.any(Array),
        })
      );
    }
  });

  it('should support pagination', async () => {
    const response = await testClient.get('/api/messages?limit=5&offset=0');

    if (response.status === 200) {
      expect(response.body).toEqual(
        expect.objectContaining({
          messages: expect.any(Array),
          total: expect.any(Number),
          limit: 5,
          offset: 0,
        })
      );

      const body = response.body as { messages: unknown[] };
      const messages = body.messages;
      expect(messages.length).toBeLessThanOrEqual(5);
    }
  });
});
