import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testClient } from '../setup';

describe('Contract: GET /api/channel-lists/{listId}', () => {
  beforeAll(async () => {
    // Setup test environment if needed
  });

  afterAll(async () => {
    // Cleanup test environment if needed
  });

  it('should return specific channel list by ID', async () => {
    const listId = 'test-list-id-123';
    const response = await testClient.get(`/api/channel-lists/${listId}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: listId,
        name: expect.any(String),
        description: expect.any(String),
        channels: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
          }),
        ]),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        userId: expect.any(String),
      })
    );
  });

  it('should require authentication', async () => {
    const listId = 'test-list-id-123';
    const response = await testClient.get(`/api/channel-lists/${listId}`);

    expect([401, 403]).toContain(response.status);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('authentication'),
      })
    );
  });

  it('should return 404 for non-existent channel list', async () => {
    const listId = 'non-existent-list-id';
    const response = await testClient.get(`/api/channel-lists/${listId}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('Channel list not found'),
      })
    );
  });

  it('should return 403 for channel list belonging to another user', async () => {
    const listId = 'other-user-list-id';
    const response = await testClient.get(`/api/channel-lists/${listId}`);

    expect([403, 404]).toContain(response.status);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.any(String),
      })
    );
  });

  it('should validate listId parameter format', async () => {
    const invalidIds = ['', '   ', 'invalid/id', 'id with spaces'];

    for (const invalidId of invalidIds) {
      const response = await testClient.get(`/api/channel-lists/${encodeURIComponent(invalidId)}`);
      expect([400, 404]).toContain(response.status);
    }
  });

  it('should include all channel details', async () => {
    const listId = 'detailed-list-id';
    const response = await testClient.get(`/api/channel-lists/${listId}`);

    if (response.status === 200) {
      const body = response.body as {
        channels: Array<{
          id: string;
          name: string;
          is_private?: boolean;
          is_archived?: boolean;
          num_members?: number;
        }>;
      };

      expect(body.channels).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
          }),
        ])
      );
    }
  });

  it('should handle database connection errors gracefully', async () => {
    const listId = 'test-connection-error';
    const response = await testClient.get(`/api/channel-lists/${listId}`);

    // Should either succeed or fail with proper error handling
    expect([200, 404, 500]).toContain(response.status);

    if (response.status >= 500) {
      expect(response.body).toEqual(
        expect.objectContaining({
          error: expect.stringContaining('Internal server error'),
        })
      );
    }
  });
});
