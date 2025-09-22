import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { type NextRequest, NextResponse } from 'next/server';
import { ChannelManager } from '../../../../lib/channel-manager';
import {
  type ChannelList,
  createChannelList,
  validateChannelList,
} from '../../../../lib/types/channel-list';

interface ErrorResponse {
  error: string;
  message: string;
}

interface ChannelListResponse {
  success: boolean;
  channelList: ChannelList;
}

interface UpdateChannelListRequest {
  name?: string;
  description?: string;
  channelIds?: string[];
  isActive?: boolean;
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
  { params }: { params: { listId: string } }
): Promise<NextResponse<ChannelListResponse | ErrorResponse>> {
  try {
    const _user = await authenticate(request);
    const { listId } = params;

    if (!listId) {
      return NextResponse.json(
        {
          error: 'INVALID_LIST_ID',
          message: 'Valid list ID is required',
        },
        { status: 400 }
      );
    }

    const channelManager = new ChannelManager();
    const channelList = await channelManager.getChannelList(listId);

    if (!channelList) {
      return NextResponse.json(
        {
          error: 'CHANNEL_LIST_NOT_FOUND',
          message: 'Channel list not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        channelList,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to fetch channel list:', error);

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
        error: 'FETCH_CHANNEL_LIST_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch channel list',
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { listId: string } }
): Promise<NextResponse<ChannelListResponse | ErrorResponse>> {
  try {
    const user = await authenticate(request);
    const { listId } = params;
    const requestData = (await request.json()) as UpdateChannelListRequest;

    if (!listId) {
      return NextResponse.json(
        {
          error: 'INVALID_LIST_ID',
          message: 'Valid list ID is required',
        },
        { status: 400 }
      );
    }

    const channelManager = new ChannelManager();

    // Get existing channel list
    const existingChannelList = await channelManager.getChannelList(listId);

    if (!existingChannelList) {
      return NextResponse.json(
        {
          error: 'CHANNEL_LIST_NOT_FOUND',
          message: 'Channel list not found',
        },
        { status: 404 }
      );
    }

    // Check ownership
    if (existingChannelList.ownerId !== user.uid) {
      return NextResponse.json(
        {
          error: 'ACCESS_DENIED',
          message: 'You do not have permission to update this channel list',
        },
        { status: 403 }
      );
    }

    // Update channel list
    const updatedChannelList = createChannelList({
      ...existingChannelList,
      ...requestData,
      id: listId,
      ownerId: user.uid,
      updatedAt: undefined, // Will be set by createChannelList
    });

    // Validate the updated channel list
    validateChannelList(updatedChannelList);

    // Save the updated channel list
    const savedChannelList = await channelManager.updateChannelList(listId, updatedChannelList);

    return NextResponse.json(
      {
        success: true,
        channelList: savedChannelList,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to update channel list:', error);

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
        error: 'UPDATE_CHANNEL_LIST_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update channel list',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { listId: string } }
): Promise<NextResponse<ChannelListResponse | ErrorResponse>> {
  try {
    const user = await authenticate(request);
    const { listId } = params;

    if (!listId) {
      return NextResponse.json(
        {
          error: 'INVALID_LIST_ID',
          message: 'Valid list ID is required',
        },
        { status: 400 }
      );
    }

    const channelManager = new ChannelManager();

    // Get existing channel list
    const existingChannelList = await channelManager.getChannelList(listId);

    if (!existingChannelList) {
      return NextResponse.json(
        {
          error: 'CHANNEL_LIST_NOT_FOUND',
          message: 'Channel list not found',
        },
        { status: 404 }
      );
    }

    // Check ownership
    if (existingChannelList.ownerId !== user.uid) {
      return NextResponse.json(
        {
          error: 'ACCESS_DENIED',
          message: 'You do not have permission to delete this channel list',
        },
        { status: 403 }
      );
    }

    // Delete the channel list
    await channelManager.deleteChannelList(listId);

    return NextResponse.json(
      {
        success: true,
        channelList: existingChannelList,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to delete channel list:', error);

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
        error: 'DELETE_CHANNEL_LIST_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete channel list',
      },
      { status: 500 }
    );
  }
}
