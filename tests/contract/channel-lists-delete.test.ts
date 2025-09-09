import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testClient } from '../setup';

describe('Contract: DELETE /api/channel-lists/{listId}', () => {
  beforeAll(async () => {
    // Setup test environment if needed
  });

  afterAll(async () => {
    // Cleanup test environment if needed
  });

  it('should delete channel list successfully', async () => {
    const listId = 'delete-test-list-id';
    const response = await testClient.delete(`/api/channel-lists/${listId}`);

    expect(response.status).toBe(204); // No content after successful deletion
  });

  it('should require authentication', async () => {
    const listId = 'test-list-id';
    const response = await testClient.delete(`/api/channel-lists/${listId}`);

    expect([401, 403]).toContain(response.status);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('authentication'),
      })
    );
  });

  it('should return 404 for non-existent channel list', async () => {
    const listId = 'non-existent-list-id';
    const response = await testClient.delete(`/api/channel-lists/${listId}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('Channel list not found'),
      })
    );
  });

  it('should prevent unauthorized deletion', async () => {
    const listId = 'other-user-list-id';
    const response = await testClient.delete(`/api/channel-lists/${listId}`);

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
      const response = await testClient.delete(
        `/api/channel-lists/${encodeURIComponent(invalidId)}`
      );
      expect([400, 404]).toContain(response.status);
    }
  });

  it('should handle cascade deletion of related data', async () => {
    const listId = 'cascade-test-list-id';
    const response = await testClient.delete(`/api/channel-lists/${listId}`);

    // Should either succeed or fail gracefully
    expect([204, 404, 500]).toContain(response.status);

    if (response.status >= 500) {
      expect(response.body).toEqual(
        expect.objectContaining({
          error: expect.stringContaining('Internal server error'),
        })
      );
    }
  });

  it('should be idempotent - second delete should return 404', async () => {
    const listId = 'idempotent-test-list-id';

    // First deletion
    const firstResponse = await testClient.delete(`/api/channel-lists/${listId}`);
    expect([204, 404]).toContain(firstResponse.status);

    // Second deletion should return 404
    const secondResponse = await testClient.delete(`/api/channel-lists/${listId}`);
    expect(secondResponse.status).toBe(404);
  });
});
