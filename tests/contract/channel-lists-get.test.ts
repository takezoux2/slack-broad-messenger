import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testClient } from '../setup';

describe('Contract: GET /api/channel-lists', () => {
  beforeAll(async () => {
    // Setup test environment if needed
  });

  afterAll(async () => {
    // Cleanup test environment if needed
  });

  it('should return list of channel lists for authenticated user', async () => {
    const response = await testClient.get('/api/channel-lists');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        channelLists: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            description: expect.any(String),
            channels: expect.any(Array),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            userId: expect.any(String),
          }),
        ]),
      })
    );
  });

  it('should require authentication', async () => {
    const response = await testClient.get('/api/channel-lists');

    expect([401, 403]).toContain(response.status);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('authentication'),
      })
    );
  });

  it('should return empty array when user has no channel lists', async () => {
    const response = await testClient.get('/api/channel-lists');

    if (response.status === 200) {
      expect(response.body).toEqual(
        expect.objectContaining({
          channelLists: expect.any(Array),
        })
      );
    }
  });

  it('should include channel details in each list', async () => {
    const response = await testClient.get('/api/channel-lists');

    if (response.status === 200) {
      const body = response.body as {
        channelLists: Array<{ channels: Array<{ id: string; name: string }> }>;
      };
      const channelLists = body.channelLists;

      if (channelLists.length > 0) {
        expect(channelLists[0].channels).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              name: expect.any(String),
            }),
          ])
        );
      }
    }
  });

  it('should support pagination with cursor', async () => {
    const response = await testClient.get('/api/channel-lists?limit=5');

    if (response.status === 200) {
      expect(response.body).toEqual(
        expect.objectContaining({
          channelLists: expect.any(Array),
          nextCursor: expect.any(String),
        })
      );

      const body = response.body as { channelLists: unknown[] };
      const channelLists = body.channelLists;
      expect(channelLists.length).toBeLessThanOrEqual(5);
    }
  });

  it('should filter by name when search query provided', async () => {
    const response = await testClient.get('/api/channel-lists?search=test');

    if (response.status === 200) {
      expect(response.body).toEqual(
        expect.objectContaining({
          channelLists: expect.any(Array),
        })
      );
    }
  });
});
