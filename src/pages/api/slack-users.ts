import type { NextApiRequest, NextApiResponse } from 'next';

interface ErrorResponse {
  error: string;
  message: string;
}

export default async function handler(_req: NextApiRequest, res: NextApiResponse<ErrorResponse>) {
  // Deprecated: This endpoint was specific to Slack OAuth integration
  // which has been replaced with Google OAuth
  return res.status(410).json({
    error: 'ENDPOINT_DEPRECATED',
    message: 'Slack users endpoint is no longer available with Google OAuth integration.',
  });
}
