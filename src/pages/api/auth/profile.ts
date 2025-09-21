import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthManager } from '../../../lib/auth-manager';
import type { User } from '../../../lib/types/user';

interface ErrorResponse {
  error: string;
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<User | ErrorResponse>
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
    const currentUser = authManager.getCurrentAuthState().user;

    if (!currentUser) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User not authenticated',
      });
    }

    const userProfile = await authManager.getUserProfile(currentUser.uid);

    if (!userProfile) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'User profile not found',
      });
    }

    return res.status(200).json(userProfile);
  } catch (error) {
    console.error('Failed to get user profile:', error);
    return res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Failed to get user profile',
    });
  }
}
