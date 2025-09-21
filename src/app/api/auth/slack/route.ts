import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

interface ErrorResponse {
  error: string;
  message: string;
}

export async function GET(_request: NextRequest): Promise<NextResponse<ErrorResponse>> {
  // Deprecated: Slack OAuth has been replaced with Google OAuth
  return NextResponse.json(
    {
      error: 'ENDPOINT_DEPRECATED',
      message:
        'Slack OAuth has been replaced with Google OAuth. Use /api/auth/google/signin instead.',
    },
    { status: 410 }
  );
}
