import type { NextApiResponse } from 'next';
import { withAuth, AuthenticatedApiRequest } from '../../lib/auth-middleware';
import { MessageSender } from '../../lib/message-sender';
import { Message, validateMessage, createMessage } from '../../lib/types/message';

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

async function handler(
  req: AuthenticatedApiRequest,
  res: NextApiResponse<MessagesResponse | CreateMessageResponse | ErrorResponse>
) {
  const messageSender = new MessageSender();

  if (req.method === 'GET') {
    try {
      // Get recent messages with default pagination
      const messages = await messageSender.getMessages(20, 0);

      return res.status(200).json({
        success: true,
        messages,
        total: messages.length,
      });
    } catch (error) {
      console.error('Failed to fetch messages:', error);

      return res.status(500).json({
        error: 'FETCH_MESSAGES_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch messages',
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { uid } = req.user;
      const requestData = req.body as CreateMessageRequest;

      // Validate request data
      if (!requestData.content || !requestData.channelListId || !requestData.selectedSenderId) {
        return res.status(400).json({
          error: 'INVALID_REQUEST_DATA',
          message: 'Content, channelListId, and selectedSenderId are required',
        });
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

      return res.status(201).json({
        success: true,
        message: sentMessage,
      });
    } catch (error) {
      console.error('Failed to create message:', error);

      if (error instanceof Error && error.message.includes('validation')) {
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: error.message,
        });
      }

      return res.status(500).json({
        error: 'CREATE_MESSAGE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create message',
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
