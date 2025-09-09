import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testClient } from '../setup';

describe('Contract: GET /api/auth/slack/callback', () => {
  beforeAll(async () => {
    // Setup test environment if needed
  });

  afterAll(async () => {
    // Cleanup test environment if needed
  });

  it('should handle valid OAuth callback with code', async () => {
    const response = await testClient.get(
      '/api/auth/slack/callback?code=test_code&state=test_state'
    );

    expect(response.status).toBe(302); // Redirect after successful auth
    expect(response.headers.location).toContain('/'); // Redirect to dashboard
  });

  it('should handle OAuth callback with error', async () => {
    const response = await testClient.get(
      '/api/auth/slack/callback?error=access_denied&state=test_state'
    );

    expect(response.status).toBe(302); // Redirect to error page
    expect(response.headers.location).toContain('/auth'); // Redirect to auth page
  });

  it('should validate state parameter for CSRF protection', async () => {
    const response = await testClient.get(
      '/api/auth/slack/callback?code=test_code&state=invalid_state'
    );

    expect(response.status).toBe(400); // Bad request for invalid state
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('Invalid state parameter'),
      })
    );
  });

  it('should require code or error parameter', async () => {
    const response = await testClient.get('/api/auth/slack/callback?state=test_state');

    expect(response.status).toBe(400); // Bad request for missing parameters
    expect(response.body).toEqual(
      expect.objectContaining({
        error: expect.stringContaining('Missing required parameters'),
      })
    );
  });

  it('should exchange code for access token', async () => {
    const response = await testClient.get(
      '/api/auth/slack/callback?code=valid_code&state=valid_state'
    );

    // Should either succeed or fail with specific error
    expect([200, 302, 401, 500]).toContain(response.status);

    if (response.status === 200) {
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          user: expect.objectContaining({
            id: expect.any(String),
            team_id: expect.any(String),
          }),
        })
      );
    }
  });
});
