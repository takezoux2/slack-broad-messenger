import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { type NextRequest, NextResponse } from 'next/server';
import { MessageSender } from '../../../lib/message-sender';
import type { Message } from '../../../lib/types/message';

interface ErrorResponse {
  error: string;
  message: string;
}

interface MessagesResponse {
  success: boolean;
  messages: Message[];
  total: number;
}

interface CreateMessageResponse {
  success: boolean;
  message: Message;
}

interface CreateMessageRequest {
  content: string;
  channelListId: string;
  selectedSenderId: string;
  scheduledAt?: string; // ISO string
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
  request: NextRequest
): Promise<NextResponse<MessagesResponse | ErrorResponse>> {
  try {
    const _user = await authenticate(request);
    const messageSender = new MessageSender();

    // Get recent messages with default pagination
    const messages = await messageSender.getMessages(20, 0);

    return NextResponse.json(
      {
        success: true,
        messages,
        total: messages.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to fetch messages:', error);

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

    return NextResponse.json(
      {
        error: 'FETCH_MESSAGES_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch messages',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateMessageResponse | ErrorResponse>> {
  try {
    const _user = await authenticate(request);
    const messageSender = new MessageSender();
    const requestData = (await request.json()) as CreateMessageRequest;

    // Validate request data
    if (!requestData.content || !requestData.channelListId || !requestData.selectedSenderId) {
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST_DATA',
          message: 'Content, channelListId, and selectedSenderId are required',
        },
        { status: 400 }
      );
    }

    // Send the message using MessageSender
    const sentMessage = await messageSender.sendMessage(
      requestData.content,
      requestData.channelListId,
      requestData.selectedSenderId,
      {
        retryCount: 3,
        batchSize: 10,
      }
    );

    return NextResponse.json(
      {
        success: true,
        message: sentMessage,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create message:', error);

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

    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'CREATE_MESSAGE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create message',
      },
      { status: 500 }
    );
  }
}
