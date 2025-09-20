import type { NextApiResponse } from 'next';
import { withAuth, AuthenticatedApiRequest } from '../../../lib/auth-middleware';
import { ChannelManager } from '../../../lib/channel-manager';
import {
  ChannelList,
  validateChannelList,
  createChannelList,
} from '../../../lib/types/channel-list';

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

async function handler(
  req: AuthenticatedApiRequest,
  res: NextApiResponse<ChannelListResponse | ErrorResponse>
) {
  const { listId } = req.query;

  if (!listId || typeof listId !== 'string') {
    return res.status(400).json({
      error: 'INVALID_LIST_ID',
      message: 'Valid list ID is required',
    });
  }

  const channelManager = new ChannelManager();

  if (req.method === 'GET') {
    try {
      const channelList = await channelManager.getChannelList(listId);

      if (!channelList) {
        return res.status(404).json({
          error: 'CHANNEL_LIST_NOT_FOUND',
          message: 'Channel list not found',
        });
      }

      return res.status(200).json({
        success: true,
        channelList,
      });
    } catch (error) {
      console.error('Failed to fetch channel list:', error);

      return res.status(500).json({
        error: 'FETCH_CHANNEL_LIST_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch channel list',
      });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { uid } = req.user;
      const requestData = req.body as UpdateChannelListRequest;

      // Get existing channel list
      const existingChannelList = await channelManager.getChannelList(listId);

      if (!existingChannelList) {
        return res.status(404).json({
          error: 'CHANNEL_LIST_NOT_FOUND',
          message: 'Channel list not found',
        });
      }

      // Check ownership
      if (existingChannelList.ownerId !== uid) {
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          message: 'You do not have permission to update this channel list',
        });
      }

      // Update channel list
      const updatedChannelList = createChannelList({
        ...existingChannelList,
        ...requestData,
        id: listId,
        ownerId: uid,
        updatedAt: undefined, // Will be set by createChannelList
      });

      // Validate the updated channel list
      validateChannelList(updatedChannelList);

      // Save the updated channel list
      const savedChannelList = await channelManager.updateChannelList(listId, updatedChannelList);

      return res.status(200).json({
        success: true,
        channelList: savedChannelList,
      });
    } catch (error) {
      console.error('Failed to update channel list:', error);

      if (error instanceof Error && error.message.includes('validation')) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: error.message,
        });
      }

      return res.status(500).json({
        error: 'UPDATE_CHANNEL_LIST_FAILED',
        message: error instanceof Error ? error.message : 'Failed to update channel list',
      });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { uid } = req.user;

      // Get existing channel list
      const existingChannelList = await channelManager.getChannelList(listId);

      if (!existingChannelList) {
        return res.status(404).json({
          error: 'CHANNEL_LIST_NOT_FOUND',
          message: 'Channel list not found',
        });
      }

      // Check ownership
      if (existingChannelList.ownerId !== uid) {
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          message: 'You do not have permission to delete this channel list',
        });
      }

      // Delete the channel list
      await channelManager.deleteChannelList(listId);

      return res.status(200).json({
        success: true,
        channelList: existingChannelList,
      });
    } catch (error) {
      console.error('Failed to delete channel list:', error);

      return res.status(500).json({
        error: 'DELETE_CHANNEL_LIST_FAILED',
        message: error instanceof Error ? error.message : 'Failed to delete channel list',
      });
    }
  }

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).json({
    error: 'METHOD_NOT_ALLOWED',
    message: 'Only GET, PUT, and DELETE methods are allowed',
  });
}

export default withAuth(handler);
