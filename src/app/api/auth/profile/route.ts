import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { AuthManager } from '../../../../lib/auth-manager';
import { createSecureResponse, handleCorsPreflightRequest } from '../../../../lib/cors';
import type { User } from '../../../../lib/types/user';

// Request validation schema for PUT requests
const ProfileUpdateRequestSchema = z.object({
  displayName: z.string().min(1).optional(),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
      language: z.string().optional(),
      timezone: z.string().optional(),
      notifications: z
        .object({
          email: z.boolean().optional(),
          push: z.boolean().optional(),
          messageDelivery: z.boolean().optional(),
          errorAlerts: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
  settings: z
    .object({
      defaultMessageSettings: z
        .object({
          sendImmediately: z.boolean().optional(),
          confirmBeforeSend: z.boolean().optional(),
          saveAsDraft: z.boolean().optional(),
        })
        .optional(),
      rateLimiting: z
        .object({
          messagesPerMinute: z.number().optional(),
          maxConcurrentChannels: z.number().optional(),
        })
        .optional(),
      dataRetention: z
        .object({
          keepSentMessages: z.boolean().optional(),
          retentionPeriodDays: z.number().optional(),
        })
        .optional(),
    })
    .optional(),
});

// Initialize the auth manager
const authManager = new AuthManager();

/**
 * OPTIONS /api/auth/profile
 * Handles CORS preflight requests
 */
export async function OPTIONS(): Promise<NextResponse> {
  return handleCorsPreflightRequest();
}

/**
 * GET /api/auth/profile
 * Returns the current user's profile
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract authorization header
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

    if (!authHeader) {
      return createSecureResponse(
        { error: 'authentication_required', message: 'Authorization header is required' },
        { status: 401 }
      );
    }

    // Validate authorization header format
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json(
        {
          error: 'INVALID_AUTH_FORMAT',
          message: 'Authorization header must be in format "Bearer <token>"',
        },
        { status: 401 }
      );
    }

    // Extract the token
    const token = authHeader.substring(7); // Remove "Bearer " prefix

    if (!token) {
      return NextResponse.json(
        { error: 'authentication_required', message: 'Firebase token is required' },
        { status: 401 }
      );
    }

    // Verify the Firebase token and get user profile
    let userProfile: User | null;
    try {
      userProfile = await authManager.verifyTokenAndGetProfile(token);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          return NextResponse.json(
            { error: 'TOKEN_EXPIRED', message: 'Firebase token has expired' },
            { status: 401 }
          );
        }
        if (error.message.includes('invalid')) {
          return NextResponse.json(
            { error: 'INVALID_TOKEN', message: 'Invalid Firebase token' },
            { status: 401 }
          );
        }
        if (error.message.includes('not found')) {
          return NextResponse.json(
            { error: 'USER_NOT_FOUND', message: 'User profile not found' },
            { status: 404 }
          );
        }
      }

      return NextResponse.json(
        { error: 'AUTH_ERROR', message: 'Authentication failed' },
        { status: 401 }
      );
    }

    if (!userProfile) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'User profile not found' },
        { status: 404 }
      );
    }

    // Return the user profile with proper formatting
    return createSecureResponse({
      uid: userProfile.uid,
      email: userProfile.email,
      displayName: userProfile.displayName,
      avatar: userProfile.avatar || '',
      googleUserId: userProfile.googleUserId,
      lastLoginAt: userProfile.lastLoginAt.toDate().toISOString(),
      createdAt: userProfile.createdAt.toDate().toISOString(),
      preferences: userProfile.preferences,
      settings: userProfile.settings,
    });
  } catch (error) {
    console.error('Error in GET /api/auth/profile:', error);

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/auth/profile
 * Updates the current user's profile
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract authorization header
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authorization header is required' },
        { status: 401 }
      );
    }

    // Validate authorization header format
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return NextResponse.json(
        {
          error: 'INVALID_AUTH_FORMAT',
          message: 'Authorization header must be in format "Bearer <token>"',
        },
        { status: 401 }
      );
    }

    // Extract the token
    const token = authHeader.substring(7); // Remove "Bearer " prefix

    if (!token) {
      return NextResponse.json(
        { error: 'authentication_required', message: 'Firebase token is required' },
        { status: 401 }
      );
    }

    // Parse request body
    let requestBody: unknown;
    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'INVALID_JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    // Validate request body
    let validatedData: z.infer<typeof ProfileUpdateRequestSchema>;
    try {
      validatedData = ProfileUpdateRequestSchema.parse(requestBody);
    } catch {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid request data format' },
        { status: 422 }
      );
    }

    // Verify the Firebase token first
    let currentUserProfile: User | null;
    try {
      currentUserProfile = await authManager.verifyTokenAndGetProfile(token);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          return NextResponse.json(
            { error: 'TOKEN_EXPIRED', message: 'Firebase token has expired' },
            { status: 401 }
          );
        }
        if (error.message.includes('invalid')) {
          return NextResponse.json(
            { error: 'INVALID_TOKEN', message: 'Invalid Firebase token' },
            { status: 401 }
          );
        }
        if (error.message.includes('not found')) {
          return NextResponse.json(
            { error: 'USER_NOT_FOUND', message: 'User profile not found' },
            { status: 404 }
          );
        }
      }

      return NextResponse.json(
        { error: 'AUTH_ERROR', message: 'Authentication failed' },
        { status: 401 }
      );
    }

    if (!currentUserProfile) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'User profile not found' },
        { status: 404 }
      );
    }

    // Update the user profile
    try {
      // Cast the validated data to Partial<User> since we've validated the structure
      await authManager.updateUserProfile(currentUserProfile.uid, validatedData as Partial<User>);

      return NextResponse.json({
        success: true,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      console.error('Error updating user profile:', error);

      return NextResponse.json(
        { error: 'UPDATE_ERROR', message: 'Failed to update user profile' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in PUT /api/auth/profile:', error);

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
