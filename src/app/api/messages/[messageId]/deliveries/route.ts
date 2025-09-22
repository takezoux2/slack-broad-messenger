import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { type NextRequest, NextResponse } from 'next/server';
import { MessageSender } from '../../../../../lib/message-sender';
import type { MessageDelivery } from '../../../../../lib/types/message-delivery';

interface ErrorResponse {
  error: string;
  message: string;
}

interface MessageDeliveriesResponse {
  success: boolean;
  deliveries: MessageDelivery[];
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

async function authenticate(request: NextRequest) {
  // Extract token from Authorization header
  const token = extractBearerToken(request.headers.get('authorization') || undefined);

  if (!token) {
    throw new Error('missing_token');
  }

  // Verify token and get user information
  return await verifyIdToken(token);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
): Promise<NextResponse<MessageDeliveriesResponse | ErrorResponse>> {
  try {
    const _user = await authenticate(request);
    const { messageId } = params;

    if (!messageId) {
      return NextResponse.json(
        {
          error: 'INVALID_MESSAGE_ID',
          message: 'Valid message ID is required',
        },
        { status: 400 }
      );
    }

    const messageSender = new MessageSender();
    const deliveries = await messageSender.getMessageDeliveries(messageId);

    return NextResponse.json(
      {
        success: true,
        deliveries,
        total: deliveries.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to fetch message deliveries:', error);

    if (error instanceof Error && error.message === 'missing_token') {
      return NextResponse.json(
        {
          error: 'authentication_required',
          message: 'Authorization token is required',
        },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message.includes('Invalid or expired token')) {
      return NextResponse.json(
        {
          error: 'authentication_failed',
          message: error.message,
        },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        {
          error: 'MESSAGE_NOT_FOUND',
          message: 'Message not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'FETCH_MESSAGE_DELIVERIES_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch message deliveries',
      },
      { status: 500 }
    );
  }
}
