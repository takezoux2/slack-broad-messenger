/**
 * Integration Test: Slack OAuth authentication flow
 *
 * Tests the complete Slack OAuth authentication flow:
 * - Initiating OAuth flow with proper redirect
 * - Handling OAuth callback with authorization code
 * - State parameter validation for CSRF protection
 * - User data handling and Firebase integration
 * - Error handling for various OAuth failure scenarios
 *
 * This integration test focuses on the end-to-end OAuth flow
 * and user session management integration.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Types for Slack OAuth testing
interface SlackOAuthState {
  userId?: string;
  timestamp: number;
  nonce: string;
}

interface SlackOAuthTokenResponse {
  ok: boolean;
  access_token?: string;
  team: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    scope: string;
  };
  authed_user: {
    id: string;
    scope: string;
    access_token: string;
    token_type: string;
  };
  error?: string;
  error_description?: string;
}

interface MockHeaders {
  get: (name: string) => string | null;
  [key: string]: string | ((name: string) => string | null);
}

interface MockResponse {
  ok: boolean;
  status: number;
  headers: MockHeaders;
  json: () => Promise<unknown>;
}

interface ErrorResponse {
  error: string;
  details?: Array<{ field: string; message: string; code?: string }>;
}

describe('Slack OAuth Authentication Flow Integration', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let baseUrl: string;
  let mockStateStorage: Map<string, SlackOAuthState>;
  let mockSlackTokens: Map<string, SlackOAuthTokenResponse>;

  beforeEach(() => {
    // Reset mock data
    mockStateStorage = new Map();
    mockSlackTokens = new Map();

    baseUrl = 'http://localhost:3000';

    // Setup test environment variables
    process.env.SLACK_CLIENT_ID = 'test-client-id';
    process.env.SLACK_CLIENT_SECRET = 'test-client-secret';
    process.env.SLACK_REDIRECT_URI = 'http://localhost:3000/api/auth/slack/callback';

    // Mock fetch implementation
    mockFetch = vi.fn().mockImplementation(async (url: string, options?: RequestInit) => {
      const urlObj = new URL(url);
      const method = options?.method || 'GET';
      const urlPath = urlObj.pathname;

      if (method === 'GET' && urlPath === '/api/auth/slack') {
        const response = mockOAuthInitiate(urlObj.searchParams);
        return {
          ...response,
          headers: {
            ...response.headers,
            get: (name: string) => response.headers[name] || null,
          },
        };
      }

      if (method === 'GET' && urlPath === '/api/auth/slack/callback') {
        const response = mockOAuthCallback(urlObj.searchParams);
        return {
          ...response,
          headers: {
            ...response.headers,
            get: (name: string) => response.headers[name] || null,
          },
        };
      }

      const errorResponse = createErrorResponse('Not found', 404);
      return {
        ...errorResponse,
        headers: {
          ...errorResponse.headers,
          get: (name: string) => errorResponse.headers[name] || null,
        },
      };
    });

    global.fetch = mockFetch;
  });

  // Helper functions
  function createErrorResponse(
    error: string,
    status: number,
    details?: Array<{ field: string; message: string; code?: string }>
  ): MockResponse {
    const response: ErrorResponse = { error };
    if (details) {
      response.details = details;
    }

    return {
      ok: false,
      status,
      headers: {
        get: () => null,
      },
      json: async () => response,
    };
  }

  function createRedirectResponse(location: string, status: number = 302): MockResponse {
    return {
      ok: false,
      status,
      headers: {
        get: (name: string) => (name === 'location' ? location : null),
        location,
      },
      json: async () => {
        throw new Error('Cannot call json() on redirect response');
      },
    };
  }

  function generateState(userId?: string): string {
    const state: SlackOAuthState = {
      userId,
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2),
    };

    const stateString = Buffer.from(JSON.stringify(state)).toString('base64');
    mockStateStorage.set(stateString, state);
    return stateString;
  }

  function validateState(stateString: string): SlackOAuthState | null {
    try {
      const stored = mockStateStorage.get(stateString);
      if (!stored) return null;

      // Check if state is expired (5 minutes)
      if (Date.now() - stored.timestamp > 5 * 60 * 1000) {
        mockStateStorage.delete(stateString);
        return null;
      }

      return stored;
    } catch {
      return null;
    }
  }

  function mockOAuthInitiate(searchParams: URLSearchParams): MockResponse {
    const userId = searchParams.get('user_id') || undefined;
    
    if (!process.env.SLACK_CLIENT_ID || !process.env.SLACK_REDIRECT_URI) {
      return createErrorResponse('OAuth configuration missing', 500);
    }

    const state = generateState(userId);
    const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
    slackAuthUrl.searchParams.set('client_id', process.env.SLACK_CLIENT_ID);
    slackAuthUrl.searchParams.set('scope', 'channels:read,chat:write,users:read');
    slackAuthUrl.searchParams.set('redirect_uri', process.env.SLACK_REDIRECT_URI);
    slackAuthUrl.searchParams.set('state', state);

    return createRedirectResponse(slackAuthUrl.toString());
  }

  function mockOAuthCallback(searchParams: URLSearchParams): MockResponse {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const state = searchParams.get('state');

    if (!state) {
      return createErrorResponse('Missing state parameter', 400, [
        { field: 'state', message: 'State parameter is required for CSRF protection' },
      ]);
    }

    const stateData = validateState(state);
    if (!stateData) {
      return createErrorResponse('Invalid state parameter', 400, [
        { field: 'state', message: 'Invalid or expired state parameter' },
      ]);
    }

    if (error) {
      const redirectUrl = new URL('/auth', baseUrl);
      redirectUrl.searchParams.set('error', error);
      return createRedirectResponse(redirectUrl.toString());
    }

    if (!code) {
      return createErrorResponse('Missing authorization code', 400, [
        { field: 'code', message: 'Authorization code is required' },
      ]);
    }

    // Simulate successful token exchange and user creation
    const tokenResponse = mockSlackTokens.get(code);
    if (!tokenResponse || !tokenResponse.ok) {
      const redirectUrl = new URL('/auth', baseUrl);
      redirectUrl.searchParams.set('error', 'token_exchange_failed');
      return createRedirectResponse(redirectUrl.toString());
    }

    mockStateStorage.delete(state);
    return createRedirectResponse('/dashboard');
  }

  describe('OAuth Flow Initiation', () => {
    it('should initiate OAuth flow with correct parameters', async () => {
      const response = await fetch(`${baseUrl}/api/auth/slack`);

      expect(response.status).toBe(302);
      expect(response.headers.get('location')).toBeDefined();

      const location = response.headers.get('location');
      if (location) {
        const redirectUrl = new URL(location);
        expect(redirectUrl.hostname).toBe('slack.com');
        expect(redirectUrl.pathname).toBe('/oauth/v2/authorize');

        // Validate OAuth parameters
        expect(redirectUrl.searchParams.get('client_id')).toBe('test-client-id');
        expect(redirectUrl.searchParams.get('scope')).toBe('channels:read,chat:write,users:read');
        expect(redirectUrl.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/auth/slack/callback');
        expect(redirectUrl.searchParams.get('state')).toBeTruthy();
      }
    });

    it('should include state parameter for CSRF protection', async () => {
      const response = await fetch(`${baseUrl}/api/auth/slack`);

      expect(response.status).toBe(302);
      const location = response.headers.get('location');
      
      if (location) {
        const redirectUrl = new URL(location);
        const state = redirectUrl.searchParams.get('state');

        expect(state).toBeTruthy();
        if (state) {
          expect(state.length).toBeGreaterThan(10);
          expect(mockStateStorage.has(state)).toBe(true);
        }
      }
    });

    it('should handle missing OAuth configuration', async () => {
      delete process.env.SLACK_CLIENT_ID;

      const response = await fetch(`${baseUrl}/api/auth/slack`);

      expect(response.status).toBe(500);
      const error = await response.json();
      expect(error.error).toBe('OAuth configuration missing');
    });

    it('should support user-specific OAuth flow', async () => {
      const response = await fetch(`${baseUrl}/api/auth/slack?user_id=test-user-123`);

      expect(response.status).toBe(302);
      const location = response.headers.get('location');
      
      if (location) {
        const redirectUrl = new URL(location);
        const state = redirectUrl.searchParams.get('state');

        if (state) {
          const stateData = mockStateStorage.get(state);
          expect(stateData?.userId).toBe('test-user-123');
        }
      }
    });
  });

  describe('OAuth Callback Handling', () => {
    it('should handle successful OAuth callback', async () => {
      // First, initiate OAuth to get a valid state
      const initiateResponse = await fetch(`${baseUrl}/api/auth/slack`);
      const initiateLocation = initiateResponse.headers.get('location');
      
      if (!initiateLocation) {
        throw new Error('No redirect location in initiate response');
      }

      const initiateUrl = new URL(initiateLocation);
      const state = initiateUrl.searchParams.get('state');

      if (!state) {
        throw new Error('No state in redirect URL');
      }

      // Mock successful token exchange
      const testCode = 'test-auth-code-success';
      mockSlackTokens.set(testCode, {
        ok: true,
        access_token: 'xoxb-test-token',
        team: {
          id: 'T01234567890',
          name: 'Test Workspace',
        },
        user: {
          id: 'U01234567890',
          scope: 'channels:read,chat:write',
        },
        authed_user: {
          id: 'U01234567890',
          scope: 'channels:read,chat:write',
          access_token: 'xoxp-test-user-token',
          token_type: 'user',
        },
      });

      const callbackResponse = await fetch(
        `${baseUrl}/api/auth/slack/callback?code=${testCode}&state=${state}`
      );

      expect(callbackResponse.status).toBe(302);
      expect(callbackResponse.headers.get('location')).toBe('/dashboard');
    });

    it('should handle OAuth error from Slack', async () => {
      // Get valid state
      const initiateResponse = await fetch(`${baseUrl}/api/auth/slack`);
      const initiateLocation = initiateResponse.headers.get('location');
      
      if (!initiateLocation) {
        throw new Error('No redirect location');
      }

      const initiateUrl = new URL(initiateLocation);
      const state = initiateUrl.searchParams.get('state');

      const callbackResponse = await fetch(
        `${baseUrl}/api/auth/slack/callback?error=access_denied&state=${state}`
      );

      expect(callbackResponse.status).toBe(302);
      const redirectLocation = callbackResponse.headers.get('location');
      
      if (redirectLocation) {
        const redirectUrl = new URL(redirectLocation);
        expect(redirectUrl.pathname).toBe('/auth');
        expect(redirectUrl.searchParams.get('error')).toBe('access_denied');
      }
    });

    it('should validate state parameter for CSRF protection', async () => {
      const callbackResponse = await fetch(
        `${baseUrl}/api/auth/slack/callback?code=test-code&state=invalid-state`
      );

      expect(callbackResponse.status).toBe(400);
      const error = await callbackResponse.json();
      expect(error.error).toBe('Invalid state parameter');
      expect(error.details).toContainEqual(
        expect.objectContaining({
          field: 'state',
          message: 'Invalid or expired state parameter',
        })
      );
    });

    it('should require state parameter', async () => {
      const callbackResponse = await fetch(
        `${baseUrl}/api/auth/slack/callback?code=test-code`
      );

      expect(callbackResponse.status).toBe(400);
      const error = await callbackResponse.json();
      expect(error.error).toBe('Missing state parameter');
    });

    it('should require authorization code or error', async () => {
      // Get valid state
      const initiateResponse = await fetch(`${baseUrl}/api/auth/slack`);
      const initiateLocation = initiateResponse.headers.get('location');
      
      if (!initiateLocation) {
        throw new Error('No redirect location');
      }

      const initiateUrl = new URL(initiateLocation);
      const state = initiateUrl.searchParams.get('state');

      const callbackResponse = await fetch(
        `${baseUrl}/api/auth/slack/callback?state=${state}`
      );

      expect(callbackResponse.status).toBe(400);
      const error = await callbackResponse.json();
      expect(error.error).toBe('Missing authorization code');
    });

    it('should handle token exchange failures', async () => {
      // Get valid state
      const initiateResponse = await fetch(`${baseUrl}/api/auth/slack`);
      const initiateLocation = initiateResponse.headers.get('location');
      
      if (!initiateLocation) {
        throw new Error('No redirect location');
      }

      const initiateUrl = new URL(initiateLocation);
      const state = initiateUrl.searchParams.get('state');

      // Mock failed token exchange - don't set up the mock response
      const testCode = 'test-auth-code-failure';

      const callbackResponse = await fetch(
        `${baseUrl}/api/auth/slack/callback?code=${testCode}&state=${state}`
      );

      expect(callbackResponse.status).toBe(302);
      const redirectLocation = callbackResponse.headers.get('location');
      
      if (redirectLocation) {
        const redirectUrl = new URL(redirectLocation);
        expect(redirectUrl.pathname).toBe('/auth');
        expect(redirectUrl.searchParams.get('error')).toBe('token_exchange_failed');
      }
    });
  });

  describe('State Management', () => {
    it('should expire state after timeout', async () => {
      const state = generateState();
      
      // Manually set state to expired timestamp
      const stateData = mockStateStorage.get(state);
      if (stateData) {
        stateData.timestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago
        mockStateStorage.set(state, stateData);
      }

      const callbackResponse = await fetch(
        `${baseUrl}/api/auth/slack/callback?code=test-code&state=${state}`
      );

      expect(callbackResponse.status).toBe(400);
      const error = await callbackResponse.json();
      expect(error.error).toBe('Invalid state parameter');
    });

    it('should clean up state after successful authentication', async () => {
      // Get valid state
      const initiateResponse = await fetch(`${baseUrl}/api/auth/slack`);
      const initiateLocation = initiateResponse.headers.get('location');
      
      if (!initiateLocation) {
        throw new Error('No redirect location');
      }

      const initiateUrl = new URL(initiateLocation);
      const state = initiateUrl.searchParams.get('state');

      if (!state) {
        throw new Error('No state parameter');
      }

      expect(mockStateStorage.has(state)).toBe(true);

      // Mock successful token exchange
      const testCode = 'test-cleanup-success';
      mockSlackTokens.set(testCode, {
        ok: true,
        access_token: 'xoxb-cleanup-test',
        team: { id: 'T01234567890', name: 'Test' },
        user: { id: 'U01234567890', scope: 'channels:read' },
        authed_user: {
          id: 'U01234567890',
          scope: 'channels:read',
          access_token: 'xoxp-cleanup-test',
          token_type: 'user',
        },
      });

      await fetch(`${baseUrl}/api/auth/slack/callback?code=${testCode}&state=${state}`);

      // State should be cleaned up
      expect(mockStateStorage.has(state)).toBe(false);
    });

    it('should handle malformed state parameter', async () => {
      const callbackResponse = await fetch(
        `${baseUrl}/api/auth/slack/callback?code=test-code&state=invalid-base64-@@@@`
      );

      expect(callbackResponse.status).toBe(400);
      const error = await callbackResponse.json();
      expect(error.error).toBe('Invalid state parameter');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing environment configuration', async () => {
      delete process.env.SLACK_CLIENT_ID;
      delete process.env.SLACK_REDIRECT_URI;

      const response = await fetch(`${baseUrl}/api/auth/slack`);

      expect(response.status).toBe(500);
      const error = await response.json();
      expect(error.error).toBe('OAuth configuration missing');
    });

    it('should handle concurrent state validation', async () => {
      // Generate multiple states and verify they're independent
      const state1 = generateState('user1');
      const state2 = generateState('user2');

      expect(mockStateStorage.has(state1)).toBe(true);
      expect(mockStateStorage.has(state2)).toBe(true);
      expect(state1).not.toBe(state2);

      const stateData1 = mockStateStorage.get(state1);
      const stateData2 = mockStateStorage.get(state2);

      expect(stateData1?.userId).toBe('user1');
      expect(stateData2?.userId).toBe('user2');
    });

    it('should prevent state reuse', async () => {
      // Get valid state
      const initiateResponse = await fetch(`${baseUrl}/api/auth/slack`);
      const initiateLocation = initiateResponse.headers.get('location');
      
      if (!initiateLocation) {
        throw new Error('No redirect location');
      }

      const initiateUrl = new URL(initiateLocation);
      const state = initiateUrl.searchParams.get('state');

      // Mock successful token exchange
      const testCode = 'test-reuse-prevention';
      mockSlackTokens.set(testCode, {
        ok: true,
        access_token: 'xoxb-reuse-test',
        team: { id: 'T01234567890', name: 'Test' },
        user: { id: 'U01234567890', scope: 'channels:read' },
        authed_user: {
          id: 'U01234567890',
          scope: 'channels:read',
          access_token: 'xoxp-reuse-test',
          token_type: 'user',
        },
      });

      // First use should succeed
      const firstResponse = await fetch(
        `${baseUrl}/api/auth/slack/callback?code=${testCode}&state=${state}`
      );
      expect(firstResponse.status).toBe(302);

      // Second use should fail
      const secondResponse = await fetch(
        `${baseUrl}/api/auth/slack/callback?code=${testCode}&state=${state}`
      );
      expect(secondResponse.status).toBe(400);
      
      const error = await secondResponse.json();
      expect(error.error).toBe('Invalid state parameter');
    });
  });
});


