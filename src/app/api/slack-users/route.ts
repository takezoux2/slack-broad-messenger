import { NextResponse } from 'next/server';

interface ErrorResponse {
  error: string;
  message: string;
}

export async function GET(): Promise<NextResponse<ErrorResponse>> {
  // Deprecated: This endpoint was specific to Slack OAuth integration
  // which has been replaced with Google OAuth
  return NextResponse.json(
    {
      error: 'ENDPOINT_DEPRECATED',
      message: 'Slack users endpoint is no longer available with Google OAuth integration.',
    },
    { status: 410 }
  );
}
