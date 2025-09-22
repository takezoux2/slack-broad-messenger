import { type NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '../../../lib/auth-server';
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

export async function GET(
  request: NextRequest
): Promise<NextResponse<ChannelListsResponse | ErrorResponse>> {
  try {
    const _user = await verifySessionToken(request);
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
    const user = await verifySessionToken(request);
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
        error: 'CREATE_CHANNEL_LIST_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create channel list',
      },
      { status: 500 }
    );
  }
}
