import type { NextApiResponse } from 'next';
import { withAuth, AuthenticatedApiRequest } from '../../lib/auth-middleware';
import { ChannelManager } from '../../lib/channel-manager';
import { Channel } from '../../lib/types/channel';

interface ErrorResponse {
  error: string;
  message: string;
}

interface ChannelsResponse {
  success: boolean;
  channels: Channel[];
  total: number;
}

async function handler(
  req: AuthenticatedApiRequest,
  res: NextApiResponse<ChannelsResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      error: 'METHOD_NOT_ALLOWED',
      message: 'Only GET method is allowed',
    });
  }

  try {
    const channelManager = new ChannelManager();

    // Get channels for the authenticated user
    const channels = await channelManager.getChannels({
      includeArchived: false,
      includeDeleted: false,
    });

    return res.status(200).json({
      success: true,
      channels,
      total: channels.length,
    });
  } catch (error) {
    console.error('Failed to fetch channels:', error);

    return res.status(500).json({
      error: 'FETCH_CHANNELS_FAILED',
      message: error instanceof Error ? error.message : 'Failed to fetch channels',
    });
  }
}

export default withAuth(handler);
