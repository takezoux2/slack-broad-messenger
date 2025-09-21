import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { type NextRequest, NextResponse } from 'next/server';
import { ChannelManager } from '../../../lib/channel-manager';
import {
  type ChannelList,
  createChannelList,
  validateChannelList,
} from '../../../lib/types/channel-list';

interface ErrorResponse {
  error: string;
  message: string;
}

interface ChannelListsResponse {
  success: boolean;
  channelLists: ChannelList[];
  total: number;
}

interface CreateChannelListResponse {
  success: boolean;
  channelList: ChannelList;
}

interface CreateChannelListRequest {
  name: string;
  description?: string;
  channelIds: string[];
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
): Promise<NextResponse<ChannelListsResponse | ErrorResponse>> {
  try {
    const _user = await authenticate(request);
    const channelManager = new ChannelManager();

    // Get channel lists for the authenticated user
    const channelLists = await channelManager.getChannelLists();

    return NextResponse.json(
      {
        success: true,
        channelLists,
        total: channelLists.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to fetch channel lists:', error);

    if (error instanceof Error && error.message === 'missing_token') {
      return NextResponse.json(
        {
          error: 'missing_token',
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
        error: 'FETCH_CHANNEL_LISTS_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch channel lists',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateChannelListResponse | ErrorResponse>> {
  try {
    const user = await authenticate(request);
    const channelManager = new ChannelManager();
    const requestData = (await request.json()) as CreateChannelListRequest;

    // Validate request data
    if (!requestData.name || !requestData.channelIds || !Array.isArray(requestData.channelIds)) {
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST_DATA',
          message: 'Name and channelIds array are required',
        },
        { status: 400 }
      );
    }

    // Create new channel list
    const newChannelList = createChannelList({
      name: requestData.name,
      description: requestData.description || '',
      channelIds: requestData.channelIds,
      ownerId: user.uid,
    });

    // Validate the created channel list
    validateChannelList(newChannelList);

    // Save the channel list
    const savedChannelList = await channelManager.createChannelList(newChannelList);

    return NextResponse.json(
      {
        success: true,
        channelList: savedChannelList,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create channel list:', error);

    if (error instanceof Error && error.message === 'missing_token') {
      return NextResponse.json(
        {
          error: 'missing_token',
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
        error: 'CREATE_CHANNEL_LIST_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create channel list',
      },
      { status: 500 }
    );
  }
}
