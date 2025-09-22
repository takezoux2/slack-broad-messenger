import type { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '../../../lib/auth-server';
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

export async function GET(
  request: NextRequest
): Promise<NextResponse<ChannelsResponse | ErrorResponse>> {
  try {
    // Verify session token and get user information
    const _user = await verifySessionToken(request);

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

    if (error instanceof Error && error.message.includes('Invalid or expired session')) {
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
