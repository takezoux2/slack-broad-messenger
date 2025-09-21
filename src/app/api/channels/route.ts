import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { NextRequest, NextResponse } from 'next/server';
import { ChannelManager } from '../../../lib/channel-manager';
import { createSecureResponse, handleCorsPreflightRequest } from '../../../lib/cors';
import type { Channel } from '../../../lib/types/channel';

interface ErrorResponse {
  error: string;
  message: string;
}

interface ChannelsResponse {
  success: boolean;
  channels: Channel[];
  total: number;
}

/**
 * Initialize Firebase Admin SDK if not already initialized
 */
function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
      throw new Error(
        'Missing Firebase Admin SDK configuration. Please check environment variables.'
      );
    }

    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });
  }
}

/**
 * Extracts Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/);
  return match ? match[1] : null;
}

/**
 * Verifies Firebase ID token and returns user information
 */
async function verifyIdToken(idToken: string) {
  try {
    initializeFirebaseAdmin();
    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      emailVerified: decodedToken.email_verified || false,
      customClaims: decodedToken.custom_claims || {},
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid or expired token');
  }
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<ChannelsResponse | ErrorResponse>> {
  try {
    // Extract token from Authorization header
    const token = extractBearerToken(request.headers.get('authorization') || undefined);

    if (!token) {
      return createSecureResponse(
        {
          error: 'authentication_required',
          message: 'Authentication token is required',
        },
        { status: 401 }
      );
    }

    // Verify token and get user information
    const _user = await verifyIdToken(token);

    const channelManager = new ChannelManager();

    // Get channels for the authenticated user
    const channels = await channelManager.getChannels({
      includeArchived: false,
      includeDeleted: false,
    });

    return createSecureResponse(
      {
        success: true,
        channels,
        total: channels.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to fetch channels:', error);

    if (error instanceof Error && error.message.includes('Invalid or expired token')) {
      return createSecureResponse(
        {
          error: 'authentication_failed',
          message: error.message,
        },
        { status: 401 }
      );
    }

    return createSecureResponse(
      {
        error: 'FETCH_CHANNELS_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch channels',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS(): Promise<NextResponse> {
  return handleCorsPreflightRequest();
}
