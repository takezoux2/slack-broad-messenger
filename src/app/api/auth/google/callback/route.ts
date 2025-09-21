import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { AuthManager } from '../../../../../lib/auth-manager';

// Initialize the auth manager
const authManager = new AuthManager();

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth callback
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle OAuth errors from Google
    if (error) {
      return NextResponse.json(
        { error: 'OAUTH_ERROR', message: `Google OAuth error: ${error}` },
        { status: 400 }
      );
    }

    // Validate required parameters
    if (!code) {
      return NextResponse.json(
        { error: 'MISSING_CODE', message: 'Authorization code is required' },
        { status: 422 }
      );
    }

    if (!state) {
      return NextResponse.json(
        { error: 'MISSING_STATE', message: 'State parameter is required' },
        { status: 422 }
      );
    }

    // Validate OAuth state
    try {
      authManager.validateGoogleOAuthState(state);
    } catch {
      return NextResponse.json(
        { error: 'INVALID_STATE', message: 'Invalid or expired OAuth state' },
        { status: 400 }
      );
    }

    // Exchange authorization code for tokens
    const tokenInfo = await exchangeCodeForTokens(code);

    // Complete the OAuth process and create/update user
    const user = await authManager.completeGoogleOAuth(tokenInfo);

    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        googleUserId: user.googleUserId,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/auth/google/callback:', error);

    if (error instanceof Error) {
      if (error.message.includes('invalid_grant')) {
        return NextResponse.json(
          { error: 'INVALID_CODE', message: 'Invalid or expired authorization code' },
          { status: 400 }
        );
      }
      if (error.message.includes('invalid_request')) {
        return NextResponse.json(
          { error: 'INVALID_REQUEST', message: 'Invalid OAuth request' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Exchanges authorization code for Google OAuth tokens
 */
async function exchangeCodeForTokens(code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const errorData = await tokenResponse.json();
    throw new Error(`Token exchange failed: ${errorData.error}`);
  }

  const tokens = await tokenResponse.json();

  // Get user info from Google
  const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
    },
  });

  if (!userResponse.ok) {
    throw new Error('Failed to get user info from Google');
  }

  const userInfo = await userResponse.json();

  return {
    email: userInfo.email,
    displayName: userInfo.name,
    googleUserId: userInfo.id,
    photoURL: userInfo.picture,
    idToken: tokens.id_token,
  };
}
