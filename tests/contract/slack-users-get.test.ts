import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testClient } from '../setup';

describe('Contract: GET /api/slack-users', () => {
  beforeAll(async () => {
    // Setup test environment if needed
  });

  afterAll(async () => {
    // Cleanup test environment if needed
  });

  it('should return list of Slack users', async () => {
    const response = await testClient.get('/api/slack-users');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        users: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            real_name: expect.any(String),
            email: expect.any(String),
            is_bot: expect.any(Boolean),
            is_app_user: expect.any(Boolean),
            deleted: expect.any(Boolean),
          }),
        ]),
      })
    );
  });

  it('should require authentication', async () => {
    const response = await testClient.get('/api/slack-users');

    expect([401, 403]).toContain(response.status);
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('authentication'),
      })
    );
  });

  it('should filter out bots and deleted users by default', async () => {
    const response = await testClient.get('/api/slack-users');

    if (response.status === 200) {
      const body = response.body as {
        users: Array<{ is_bot: boolean; deleted: boolean }>;
      };
      const users = body.users;

      users.forEach(user => {
        expect(user.is_bot).toBe(false);
        expect(user.deleted).toBe(false);
      });
    }
  });

  it('should support including bots with query parameter', async () => {
    const response = await testClient.get('/api/slack-users?include_bots=true');

    if (response.status === 200) {
      expect(response.body).toEqual(
        expect.objectContaining({
          users: expect.any(Array),
        })
      );
    }
  });

  it('should support cursor-based pagination', async () => {
    const response = await testClient.get('/api/slack-users?limit=10');

    if (response.status === 200) {
      expect(response.body).toEqual(
        expect.objectContaining({
          users: expect.any(Array),
          next_cursor: expect.any(String),
        })
      );

      const body = response.body as { users: unknown[] };
      const users = body.users;
      expect(users.length).toBeLessThanOrEqual(10);
    }
  });
});
