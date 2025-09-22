import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Request validation schema
const SigninRequestSchema = z.object({
  redirectUrl: z.string().optional(),
});

/**
 * POST /api/auth/google/signin
 * Initiates Google OAuth sign-in flow
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
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
    let validatedData: z.infer<typeof SigninRequestSchema>;
    try {
      validatedData = SigninRequestSchema.parse(requestBody);
    } catch {
      console.warn('Validation error:', requestBody);
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: `Invalid request data format
          ${JSON.stringify(requestBody, null, 2)}`,
        },
        { status: 422 }
      );
    }

    // Google OAuth configuration
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: 'SERVER_ERROR', message: 'Google OAuth not configured' },
        { status: 500 }
      );
    }

    // Generate OAuth state for security
    const state = generateOAuthState(validatedData.redirectUrl);

    // Build Google OAuth URL
    const authUrl = buildGoogleAuthUrl(clientId, state);

    return NextResponse.json({
      success: true,
      authUrl,
      state,
    });
  } catch (error) {
    console.error('Error in POST /api/auth/google/signin:', error);

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generates a secure OAuth state parameter
 */
function generateOAuthState(redirectUrl?: string): string {
  const state = {
    timestamp: Date.now(),
    redirectUrl: redirectUrl || '/dashboard',
    nonce: Math.random().toString(36).substring(2, 15),
  };

  return Buffer.from(JSON.stringify(state)).toString('base64');
}

/**
 * Builds the Google OAuth authorization URL
 */
function buildGoogleAuthUrl(clientId: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}
