import type { NextApiResponse } from 'next';
import { withAuth, AuthenticatedApiRequest } from '../../lib/auth-middleware';
import { ChannelManager } from '../../lib/channel-manager';
import { ChannelList, validateChannelList, createChannelList } from '../../lib/types/channel-list';

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

async function handler(
  req: AuthenticatedApiRequest,
  res: NextApiResponse<ChannelListsResponse | CreateChannelListResponse | ErrorResponse>
) {
  const channelManager = new ChannelManager();

  if (req.method === 'GET') {
    try {
      // Get channel lists for the authenticated user
      const channelLists = await channelManager.getChannelLists();

      return res.status(200).json({
        success: true,
        channelLists,
        total: channelLists.length,
      });
    } catch (error) {
      console.error('Failed to fetch channel lists:', error);

      return res.status(500).json({
        error: 'FETCH_CHANNEL_LISTS_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch channel lists',
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { uid } = req.user;
      const requestData = req.body as CreateChannelListRequest;

      // Validate request data
      if (!requestData.name || !requestData.channelIds || !Array.isArray(requestData.channelIds)) {
        return res.status(400).json({
          error: 'INVALID_REQUEST_DATA',
          message: 'Name and channelIds array are required',
        });
      }

      // Create new channel list
      const newChannelList = createChannelList({
        name: requestData.name,
        description: requestData.description || '',
        channelIds: requestData.channelIds,
        ownerId: uid,
      });

      // Validate the created channel list
      validateChannelList(newChannelList);

      // Save the channel list
      const savedChannelList = await channelManager.createChannelList(newChannelList);

      return res.status(201).json({
        success: true,
        channelList: savedChannelList,
      });
    } catch (error) {
      console.error('Failed to create channel list:', error);

      if (error instanceof Error && error.message.includes('validation')) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: error.message,
        });
      }

      return res.status(500).json({
        error: 'CREATE_CHANNEL_LIST_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create channel list',
      });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({
    error: 'METHOD_NOT_ALLOWED',
    message: 'Only GET and POST methods are allowed',
  });
}

export default withAuth(handler);
