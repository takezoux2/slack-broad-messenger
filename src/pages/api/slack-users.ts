import type { NextApiResponse } from 'next';
import { getAuthManager } from '../../lib/auth-manager';
import type { AuthenticatedApiRequest } from '../../lib/auth-middleware';
import { withAuth } from '../../lib/auth-middleware';
import type { SlackUserInfo } from '../../lib/slack';
import { getSlackUsers } from '../../lib/slack';

interface ErrorResponse {
  error: string;
  message: string;
}

interface SlackUsersResponse {
  success: boolean;
  users: SlackUserInfo[];
  total: number;
}

async function handler(
  req: AuthenticatedApiRequest,
  res: NextApiResponse<SlackUsersResponse | ErrorResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      error: 'METHOD_NOT_ALLOWED',
      message: 'Only GET method is allowed',
    });
  }

  try {
    const { uid } = req.user;
    const authManager = getAuthManager();

    // Get user profile to access Slack token
    const userProfile = await authManager.getUserProfile(uid);

    if (!userProfile || !userProfile.slackAccessToken) {
      return res.status(401).json({
        error: 'SLACK_TOKEN_MISSING',
        message: 'Slack access token not found. Please re-authenticate with Slack.',
      });
    }

    // Get users from Slack API
    const users = await getSlackUsers(userProfile.slackAccessToken);

    return res.status(200).json({
      success: true,
      users,
      total: users.length,
    });
  } catch (error) {
    console.error('Failed to fetch Slack users:', error);

    if (error instanceof Error && error.message.includes('token')) {
      return res.status(401).json({
        error: 'INVALID_SLACK_TOKEN',
        message: 'Invalid or expired Slack token',
      });
    }

    return res.status(500).json({
      error: 'FETCH_SLACK_USERS_FAILED',
      message: error instanceof Error ? error.message : 'Failed to fetch Slack users',
    });
  }
}

export default withAuth(handler);
