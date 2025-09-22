import { type NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '../../../lib/auth-server';
import { MessageSender } from '../../../lib/message-sender';
import type { Message } from '../../../lib/types/message';

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

export async function GET(
  request: NextRequest
): Promise<NextResponse<MessagesResponse | ErrorResponse>> {
  try {
    const _user = await verifySessionToken(request);
    const messageSender = new MessageSender();

    // Get recent messages with default pagination
    const messages = await messageSender.getMessages(20, 0);

    return NextResponse.json(
      {
        success: true,
        messages,
        total: messages.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to fetch messages:', error);

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
        error: 'FETCH_MESSAGES_FAILED',
        message: error instanceof Error ? error.message : 'Failed to fetch messages',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateMessageResponse | ErrorResponse>> {
  try {
    const _user = await verifySessionToken(request);
    const messageSender = new MessageSender();
    const requestData = (await request.json()) as CreateMessageRequest;

    // Validate request data
    if (!requestData.content || !requestData.channelListId || !requestData.selectedSenderId) {
      return NextResponse.json(
        {
          error: 'INVALID_REQUEST_DATA',
          message: 'Content, channelListId, and selectedSenderId are required',
        },
        { status: 400 }
      );
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

    return NextResponse.json(
      {
        success: true,
        message: sentMessage,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create message:', error);

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
        error: 'CREATE_MESSAGE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to create message',
      },
      { status: 500 }
    );
  }
}
