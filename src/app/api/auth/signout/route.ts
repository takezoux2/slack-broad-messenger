import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { AuthManager } from '../../../../lib/auth-manager';

// Initialize the auth manager
const authManager = new AuthManager();

/**
 * POST /api/auth/signout
 * Signs out the current user
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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
        { error: 'MISSING_TOKEN', message: 'Firebase token is required' },
        { status: 401 }
      );
    }

    // Verify the token and get user info (to ensure user is authenticated)
    try {
      await authManager.verifyTokenAndGetProfile(token);
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

    // Sign out the user
    try {
      await authManager.signOut();

      return NextResponse.json({
        success: true,
        message: 'User signed out successfully',
      });
    } catch (error) {
      console.error('Error during signout:', error);

      return NextResponse.json(
        { error: 'SIGNOUT_ERROR', message: 'Failed to sign out user' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/auth/signout:', error);

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
