import { type NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '../../../../lib/auth-server';
import { MessageSender } from '../../../../lib/message-sender';
import type { Message } from '../../../../lib/types/message';

interface ErrorResponse {
  error: string;
  message: string;
}

interface MessageResponse {
  success: boolean;
  message: Message;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
): Promise<NextResponse<MessageResponse | ErrorResponse>> {
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
    const message = await messageSender.getMessage(messageId);

    if (!message) {
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
        success: true,
        message,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to fetch message:', error);

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
        error: 'FETCH_MESSAGE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch message',
      },
      { status: 500 }
    );
  }
}
