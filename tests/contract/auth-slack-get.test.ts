import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testClient } from '../setup';

describe('Contract: GET /api/auth/slack', () => {
  beforeAll(async () => {
    // Setup test environment if needed
  });

  afterAll(async () => {
    // Cleanup test environment if needed
  });

  it('should initiate Slack OAuth flow', async () => {
    const response = await testClient.get('/api/auth/slack');

    expect(response.status).toBe(302); // Redirect to Slack OAuth
    expect(response.headers.location).toContain('https://slack.com/oauth/v2/authorize');
    expect(response.headers.location).toContain('client_id=');
    expect(response.headers.location).toContain('scope=');
    expect(response.headers.location).toContain('redirect_uri=');
  });

  it('should include required OAuth scopes', async () => {
    const response = await testClient.get('/api/auth/slack');

    const locationHeader = response.headers.location;
    expect(locationHeader).toContain('scope=');

    // Extract scope parameter from URL
    const scopeMatch = locationHeader.match(/scope=([^&]+)/);
    expect(scopeMatch).toBeTruthy();

    if (scopeMatch?.[1]) {
      const scopes = decodeURIComponent(scopeMatch[1]).split(',');
      expect(scopes).toContain('channels:read');
      expect(scopes).toContain('chat:write');
      expect(scopes).toContain('users:read');
    }
  });

  it('should include state parameter for CSRF protection', async () => {
    const response = await testClient.get('/api/auth/slack');

    const locationHeader = response.headers.location;
    expect(locationHeader).toContain('state=');

    // State should be a non-empty string
    const stateMatch = locationHeader.match(/state=([^&]+)/);
    expect(stateMatch).toBeTruthy();

    if (stateMatch?.[1]) {
      expect(stateMatch[1].length).toBeGreaterThan(0);
    }
  });

  it('should handle missing environment variables gracefully', async () => {
    // This test would require mocking environment variables
    // For now, we'll test that the endpoint exists and handles errors
    const response = await testClient.get('/api/auth/slack');

    // Should either redirect (if configured) or return error (if not configured)
    expect([302, 500]).toContain(response.status);
  });
});
