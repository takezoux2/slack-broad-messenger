import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

// Contract test for GET /api/auth/profile
// This test MUST fail until implementation is complete

const ProfileSuccessResponseSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  avatar: z.string(),
  googleUserId: z.string().min(1),
  lastLoginAt: z.string(),
  createdAt: z.string(),
  preferences: z.object({}).passthrough(),
  settings: z.object({}).passthrough(),
});

const ProfileErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
});

describe('Contract: GET /api/auth/profile', () => {
  let mockHandler: ((request: NextRequest) => Promise<Response>) | null;

  beforeEach(async () => {
    // Import the handler (will fail initially as endpoint doesn't exist)
    try {
      const { GET } = await import('../../src/app/api/auth/profile/route');
      mockHandler = GET;
    } catch {
      mockHandler = null;
    }
  });

  afterEach(() => {
    // Clean up any test state
  });

  it('should have implemented handler', () => {
    expect(mockHandler).not.toBeNull();
  });

  it('should return user profile for authenticated user', async () => {
    if (!mockHandler) {
      expect.fail('Handler not implemented - this should not happen in current phase');
    }

    const authenticatedRequest = new NextRequest('http://localhost:3000/api/auth/profile', {
      headers: {
        Authorization: 'Bearer valid_firebase_token',
      },
    });

    const response = await mockHandler(authenticatedRequest);
    const responseData = await response.json();

    expect(response.status).toBe(200);
    expect(() => ProfileSuccessResponseSchema.parse(responseData)).not.toThrow();
    expect(responseData.uid).toBeTruthy();
    expect(responseData.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(responseData.googleUserId).toBeTruthy();
  });

  it('should reject request without authorization header', async () => {
    if (!mockHandler) {
      expect.fail('Handler not implemented - this should not happen in current phase');
    }

    const unauthenticatedRequest = new NextRequest('http://localhost:3000/api/auth/profile');

    const response = await mockHandler(unauthenticatedRequest);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(() => ProfileErrorResponseSchema.parse(responseData)).not.toThrow();
    expect(responseData.error).toBeTruthy();
    expect(responseData.message).toBeTruthy();
  });

  it('should reject request with invalid authorization header format', async () => {
    if (!mockHandler) {
      expect.fail('Handler not implemented - this should not happen in current phase');
    }

    const invalidRequest = new NextRequest('http://localhost:3000/api/auth/profile', {
      headers: {
        Authorization: 'invalid_format_token',
      },
    });

    const response = await mockHandler(invalidRequest);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(() => ProfileErrorResponseSchema.parse(responseData)).not.toThrow();
    expect(responseData.error).toBeTruthy();
  });

  it('should reject request with invalid Firebase token', async () => {
    if (!mockHandler) {
      expect.fail('Handler not implemented - this should not happen in current phase');
    }

    const invalidTokenRequest = new NextRequest('http://localhost:3000/api/auth/profile', {
      headers: {
        Authorization: 'Bearer invalid_firebase_token',
      },
    });

    const response = await mockHandler(invalidTokenRequest);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(() => ProfileErrorResponseSchema.parse(responseData)).not.toThrow();
    expect(responseData.error).toBeTruthy();
  });

  it('should reject request with expired Firebase token', async () => {
    if (!mockHandler) {
      expect.fail('Handler not implemented - this should not happen in current phase');
    }

    const expiredTokenRequest = new NextRequest('http://localhost:3000/api/auth/profile', {
      headers: {
        Authorization: 'Bearer expired_firebase_token',
      },
    });

    const response = await mockHandler(expiredTokenRequest);
    const responseData = await response.json();

    expect(response.status).toBe(401);
    expect(() => ProfileErrorResponseSchema.parse(responseData)).not.toThrow();
    expect(responseData.error).toBeTruthy();
  });

  it('should return 404 for user not found in Firestore', async () => {
    if (!mockHandler) {
      expect.fail('Handler not implemented - this should not happen in current phase');
    }

    const validTokenNotFoundRequest = new NextRequest('http://localhost:3000/api/auth/profile', {
      headers: {
        Authorization: 'Bearer valid_token_user_not_found',
      },
    });

    const response = await mockHandler(validTokenNotFoundRequest);
    const responseData = await response.json();

    expect(response.status).toBe(404);
    expect(() => ProfileErrorResponseSchema.parse(responseData)).not.toThrow();
    expect(responseData.error).toBeTruthy();
    expect(responseData.message).toContain('not found');
  });

  it('should handle server errors gracefully', async () => {
    if (!mockHandler) {
      expect.fail('Handler not implemented - this should not happen in current phase');
    }

    const request = new NextRequest('http://localhost:3000/api/auth/profile', {
      headers: {
        Authorization: 'Bearer valid_firebase_token',
      },
    });

    const response = await mockHandler(request);

    // Ensure proper error structure even on 500 errors
    if (response.status >= 500) {
      const responseData = await response.json();
      expect(() => ProfileErrorResponseSchema.parse(responseData)).not.toThrow();
      expect(responseData.error).toBeTruthy();
      expect(responseData.message).toBeTruthy();
    }
  });

  it('should validate all response fields when successful', async () => {
    if (!mockHandler) {
      expect.fail('Handler not implemented - this should not happen in current phase');
    }

    const authenticatedRequest = new NextRequest('http://localhost:3000/api/auth/profile', {
      headers: {
        Authorization: 'Bearer valid_firebase_token',
      },
    });

    const response = await mockHandler(authenticatedRequest);

    if (response.status === 200) {
      const responseData = await response.json();

      // Verify all required fields are present and properly typed
      expect(typeof responseData.uid).toBe('string');
      expect(typeof responseData.email).toBe('string');
      expect(typeof responseData.displayName).toBe('string');
      expect(typeof responseData.avatar).toBe('string');
      expect(typeof responseData.googleUserId).toBe('string');
      expect(typeof responseData.lastLoginAt).toBe('string');
      expect(typeof responseData.createdAt).toBe('string');
      expect(typeof responseData.preferences).toBe('object');
      expect(typeof responseData.settings).toBe('object');

      // Verify field constraints
      expect(responseData.uid.length).toBeGreaterThan(0);
      expect(responseData.googleUserId.length).toBeGreaterThan(0);
      expect(responseData.displayName.length).toBeGreaterThan(0);

      // Verify timestamps are valid ISO strings
      expect(() => new Date(responseData.lastLoginAt)).not.toThrow();
      expect(() => new Date(responseData.createdAt)).not.toThrow();
      expect(new Date(responseData.createdAt).getTime()).not.toBeNaN();
      expect(new Date(responseData.lastLoginAt).getTime()).not.toBeNaN();
    }
  });

  it('should handle different authorization header case variations', async () => {
    if (!mockHandler) {
      expect.fail('Handler not implemented - this should not happen in current phase');
    }

    const caseVariationRequest = new NextRequest('http://localhost:3000/api/auth/profile', {
      headers: {
        authorization: 'bearer valid_firebase_token', // lowercase
      },
    });

    const response = await mockHandler(caseVariationRequest);

    // Should either work (case-insensitive) or return proper 401 error
    if (response.status === 200) {
      const responseData = await response.json();
      expect(() => ProfileSuccessResponseSchema.parse(responseData)).not.toThrow();
    } else {
      expect(response.status).toBe(401);
      const responseData = await response.json();
      expect(() => ProfileErrorResponseSchema.parse(responseData)).not.toThrow();
    }
  });
});
