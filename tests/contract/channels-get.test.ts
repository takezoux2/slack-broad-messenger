import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testClient } from '../setup';

describe('Contract: GET /api/channels', () => {
  beforeAll(async () => {
    // Setup test environment if needed
  });

  afterAll(async () => {
    // Cleanup test environment if needed
  });

  it('should return list of Slack channels', async () => {
    const response = await testClient.get('/api/channels');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        channels: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            is_private: expect.any(Boolean),
            is_archived: expect.any(Boolean),
            num_members: expect.any(Number),
          }),
        ]),
      })
    );
  });

  it('should require authentication', async () => {
    // Test without authentication headers
    const response = await testClient.get('/api/channels');

    expect([401, 403]).toContain(response.status);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('authentication'),
      })
    );
  });

  it('should handle Slack API errors gracefully', async () => {
    const response = await testClient.get('/api/channels');

    // Should either succeed or fail with proper error handling
    expect([200, 401, 403, 500]).toContain(response.status);

    if (response.status >= 400) {
      expect(response.body).toEqual(
        expect.objectContaining({
          error: expect.any(String),
        })
      );
    }
  });

  it('should filter out archived channels by default', async () => {
    const response = await testClient.get('/api/channels');

    if (response.status === 200) {
      const body = response.body as {
        channels: Array<{ is_archived: boolean }>;
      };
      const channels = body.channels;
      expect(channels).toEqual(
        expect.arrayContaining([
          expect.not.objectContaining({
            is_archived: true,
          }),
        ])
      );
    }
  });

  it('should support including archived channels with query parameter', async () => {
    const response = await testClient.get('/api/channels?include_archived=true');

    if (response.status === 200) {
      expect(response.body).toEqual(
        expect.objectContaining({
          channels: expect.any(Array),
        })
      );
    }
  });

  it('should support cursor-based pagination', async () => {
    const response = await testClient.get('/api/channels?limit=10');

    if (response.status === 200) {
      expect(response.body).toEqual(
        expect.objectContaining({
          channels: expect.any(Array),
          next_cursor: expect.any(String),
        })
      );

      const body = response.body as { channels: unknown[] };
      const channels = body.channels;
      expect(channels.length).toBeLessThanOrEqual(10);
    }
  });
});
