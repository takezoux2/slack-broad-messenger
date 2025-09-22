import { type NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '../../../../lib/auth-server';
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

export async function GET(
  request: NextRequest,
  { params }: { params: { listId: string } }
): Promise<NextResponse<ChannelListResponse | ErrorResponse>> {
  try {
    const _user = await verifySessionToken(request);
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

    if (error instanceof Error && error.message.includes('Invalid or expired session')) {
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
    const user = await verifySessionToken(request);
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

    if (error instanceof Error && error.message.includes('Invalid or expired session')) {
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
    const user = await verifySessionToken(request);
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

    if (error instanceof Error && error.message.includes('Invalid or expired session')) {
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
