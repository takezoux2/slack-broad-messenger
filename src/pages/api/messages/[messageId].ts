import type { NextApiResponse } from 'next';
import { withAuth, AuthenticatedApiRequest } from '../../../lib/auth-middleware';
import { MessageSender } from '../../../lib/message-sender';
import { Message } from '../../../lib/types/message';

interface ErrorResponse {
  error: string;
  message: string;
}

interface MessageResponse {
  success: boolean;
  message: Message;
}

async function handler(
  req: AuthenticatedApiRequest,
  res: NextApiResponse<MessageResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      error: 'METHOD_NOT_ALLOWED',
      message: 'Only GET method is allowed',
    });
  }

  const { messageId } = req.query;

  if (!messageId || typeof messageId !== 'string') {
    return res.status(400).json({
      error: 'INVALID_MESSAGE_ID',
      message: 'Valid message ID is required',
    });
  }

  try {
    const messageSender = new MessageSender();
    const message = await messageSender.getMessage(messageId);

    if (!message) {
      return res.status(404).json({
        error: 'MESSAGE_NOT_FOUND',
        message: 'Message not found',
      });
    }

    return res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('Failed to fetch message:', error);

    return res.status(500).json({
      error: 'FETCH_MESSAGE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to fetch message',
    });
  }
}

export default withAuth(handler);
