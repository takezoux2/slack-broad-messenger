import { type NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '../../../../../lib/auth-server';
import { MessageSender } from '../../../../../lib/message-sender';
import type { MessageDelivery } from '../../../../../lib/types/message-delivery';

interface ErrorResponse {
  error: string;
  message: string;
}

interface MessageDeliveriesResponse {
  success: boolean;
  deliveries: MessageDelivery[];
  total: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
): Promise<NextResponse<MessageDeliveriesResponse | ErrorResponse>> {
  try {
    const _user = await verifySessionToken(request);
    const { messageId } = params;

    if (!messageId) {
      return NextResponse.json(
        {
          error: 'INVALID_MESSAGE_ID',
          message: 'Valid message ID is required',
        },
        { status: 400 }
      );
    }

    const messageSender = new MessageSender();
    const deliveries = await messageSender.getMessageDeliveries(messageId);

    return NextResponse.json(
      {
        success: true,
        deliveries,
        total: deliveries.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to fetch message deliveries:', error);

    if (error instanceof Error && error.message.includes('Invalid or expired session')) {
      return NextResponse.json(
        {
          error: 'authentication_failed',
          message: error.message,
        },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        {
          error: 'MESSAGE_NOT_FOUND',
          message: 'Message not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'FETCH_MESSAGE_DELIVERIES_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch message deliveries',
      },
      { status: 500 }
    );
  }
}
