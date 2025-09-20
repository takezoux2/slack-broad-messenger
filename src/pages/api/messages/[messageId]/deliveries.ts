import type { NextApiResponse } from 'next';
import { withAuth, AuthenticatedApiRequest } from '../../../../lib/auth-middleware';
import { MessageSender } from '../../../../lib/message-sender';
import { MessageDelivery } from '../../../../lib/types/message-delivery';

interface ErrorResponse {
  error: string;
  message: string;
}

interface MessageDeliveriesResponse {
  success: boolean;
  deliveries: MessageDelivery[];
  total: number;
}

async function handler(
  req: AuthenticatedApiRequest,
  res: NextApiResponse<MessageDeliveriesResponse | ErrorResponse>
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
    const deliveries = await messageSender.getMessageDeliveries(messageId);

    return res.status(200).json({
      success: true,
      deliveries,
      total: deliveries.length,
    });
  } catch (error) {
    console.error('Failed to fetch message deliveries:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'MESSAGE_NOT_FOUND',
        message: 'Message not found',
      });
    }

    return res.status(500).json({
      error: 'FETCH_MESSAGE_DELIVERIES_FAILED',
      message: error instanceof Error ? error.message : 'Failed to fetch message deliveries',
    });
  }
}

export default withAuth(handler);
