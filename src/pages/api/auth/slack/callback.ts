import type { NextApiRequest, NextApiResponse } from 'next';
import { AuthManager } from '../../../../lib/auth-manager';
import { exchangeSlackCode } from '../../../../lib/slack';

interface ErrorResponse {
  error: string;
  message: string;
}

interface CallbackSuccessResponse {
  success: boolean;
  user: {
    uid: string;
    email: string;
    displayName: string;
    slackUserId: string;
    slackTeamId: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CallbackSuccessResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      error: 'METHOD_NOT_ALLOWED',
      message: 'Only GET method is allowed',
    });
  }

  const { code, state, error } = req.query;

  // Handle Slack OAuth error
  if (error) {
    console.error('Slack OAuth error:', error);
    return res.status(400).json({
      error: 'OAUTH_ERROR',
      message: `Slack OAuth error: ${error}`,
    });
  }

  // Validate required parameters
  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    return res.status(400).json({
      error: 'MISSING_PARAMETERS',
      message: 'Missing or invalid code or state parameter',
    });
  }

  try {
    const authManager = new AuthManager();

    // Validate OAuth state
    const oauthState = authManager.validateSlackOAuthState(state);
    console.log('Valid OAuth state for user:', oauthState.uid);

    // Exchange code for access token
    const tokenInfo = await exchangeSlackCode(code);

    // Complete OAuth process and create/update user
    const user = await authManager.completeSlackOAuth(tokenInfo);

    return res.status(200).json({
      success: true,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        slackUserId: user.slackUserId!,
        slackTeamId: user.slackTeamId!,
      },
    });
  } catch (error) {
    console.error('Slack OAuth callback failed:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('state')) {
        return res.status(400).json({
          error: 'INVALID_STATE',
          message: 'Invalid or expired OAuth state',
        });
      }

      if (error.message.includes('code')) {
        return res.status(400).json({
          error: 'INVALID_CODE',
          message: 'Invalid or expired authorization code',
        });
      }
    }

    return res.status(500).json({
      error: 'OAUTH_CALLBACK_FAILED',
      message: error instanceof Error ? error.message : 'Failed to complete Slack OAuth',
    });
  }
}
