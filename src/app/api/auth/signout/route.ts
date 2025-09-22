import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/auth/signout
 * Signs out the current user
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Extract authorization header
    const authHeader = request.cookies.get('session');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Session header is required' },
        { status: 401 }
      );
    }

    // Sign out the user
    try {
      // Delete "session" cookie
      const response = NextResponse.json({
        success: true,
        message: 'User signed out successfully',
      });

      response.cookies.delete('session');
      console.info(`User signout: session header "${authHeader}" deleted`);
      return response;
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
