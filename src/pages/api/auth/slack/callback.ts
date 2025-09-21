import type { NextApiRequest, NextApiResponse } from 'next';

interface ErrorResponse {
  error: string;
  message: string;
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse<ErrorResponse>) {
  // Deprecated: Slack OAuth has been replaced with Google OAuth
  return res.status(410).json({
    error: 'ENDPOINT_DEPRECATED',
    message:
      'Slack OAuth has been replaced with Google OAuth. Use /api/auth/google/callback instead.',
  });
}
