import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testClient } from '../setup';

describe('Contract: PUT /api/channel-lists/{listId}', () => {
  beforeAll(async () => {
    // Setup test environment if needed
  });

  afterAll(async () => {
    // Cleanup test environment if needed
  });

  it('should update channel list with valid data', async () => {
    const listId = 'update-test-list-id';
    const updateData = {
      name: 'Updated Marketing Channels',
      description: 'Updated description for marketing channels',
      channels: [
        { id: 'C123456789', name: 'marketing-general' },
        { id: 'C987654321', name: 'marketing-campaigns' },
        { id: 'C456789123', name: 'marketing-social' },
      ],
    };

    const response = await testClient.put(`/api/channel-lists/${listId}`, updateData);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        id: listId,
        name: 'Updated Marketing Channels',
        description: 'Updated description for marketing channels',
        channels: expect.arrayContaining([
          expect.objectContaining({
            id: 'C123456789',
            name: 'marketing-general',
          }),
          expect.objectContaining({
            id: 'C987654321',
            name: 'marketing-campaigns',
          }),
          expect.objectContaining({
            id: 'C456789123',
            name: 'marketing-social',
          }),
        ]),
        updatedAt: expect.any(String),
        userId: expect.any(String),
      })
    );
  });

  it('should require authentication', async () => {
    const listId = 'test-list-id';
    const updateData = {
      name: 'Updated Name',
      description: 'Updated description',
    };

    const response = await testClient.put(`/api/channel-lists/${listId}`, updateData);

    expect([401, 403]).toContain(response.status);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('authentication'),
      })
    );
  });

  it('should return 404 for non-existent channel list', async () => {
    const listId = 'non-existent-list-id';
    const updateData = {
      name: 'Updated Name',
      description: 'Updated description',
    };

    const response = await testClient.put(`/api/channel-lists/${listId}`, updateData);

    expect(response.status).toBe(404);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('Channel list not found'),
      })
    );
  });

  it('should validate required fields', async () => {
    const listId = 'validation-test-list-id';
    const invalidData = {
      description: 'Missing name field',
    };

    const response = await testClient.put(`/api/channel-lists/${listId}`, invalidData);

    expect(response.status).toBe(400);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('name'),
        details: expect.any(Array),
      })
    );
  });

  it('should allow partial updates', async () => {
    const listId = 'partial-update-test-id';
    const partialData = {
      name: 'Only Name Updated',
    };

    const response = await testClient.put(`/api/channel-lists/${listId}`, partialData);

    // Should either succeed with partial update or require all fields
    expect([200, 400]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body).toEqual(
        expect.objectContaining({
          id: listId,
          name: 'Only Name Updated',
          updatedAt: expect.any(String),
        })
      );
    }
  });

  it('should prevent unauthorized updates', async () => {
    const listId = 'other-user-list-id';
    const updateData = {
      name: 'Unauthorized Update',
      description: 'Should not be allowed',
    };

    const response = await testClient.put(`/api/channel-lists/${listId}`, updateData);

    expect([403, 404]).toContain(response.status);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.any(String),
      })
    );
  });
});
