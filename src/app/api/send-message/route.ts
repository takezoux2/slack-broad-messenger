import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

interface ErrorResponse {
  error: string;
  message: string;
}

export async function POST(_request: NextRequest): Promise<NextResponse<ErrorResponse>> {
  // Legacy endpoint: send-message has been replaced with messages endpoint
  return NextResponse.json(
    {
      error: 'ENDPOINT_DEPRECATED',
      message: 'The send-message endpoint has been replaced. Use /api/messages instead.',
    },
    { status: 410 }
  );
}
