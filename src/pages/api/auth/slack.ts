import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthManager } from '../../../lib/auth-manager';
import { getSlackAuthUrl } from '../../../lib/slack';

interface ErrorResponse {
  error: string;
  message: string;
}

interface AuthRedirectResponse {
  success: boolean;
  redirectUrl: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AuthRedirectResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      error: 'METHOD_NOT_ALLOWED',
      message: 'Only GET method is allowed',
    });
  }

  try {
    const authManager = getAuthManager();
    const state = authManager.generateSlackOAuthState();
    const redirectUrl = getSlackAuthUrl(state);

    // For API responses, return the redirect URL rather than doing a redirect
    // The frontend will handle the actual redirect
    return res.status(200).json({
      success: true,
      redirectUrl,
    });
  } catch (error) {
    console.error('Slack OAuth initialization failed:', error);

    return res.status(500).json({
      error: 'OAUTH_INIT_FAILED',
      message: error instanceof Error ? error.message : 'Failed to initialize Slack OAuth',
    });
  }
}
