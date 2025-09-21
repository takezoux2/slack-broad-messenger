import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthManager } from '../../../lib/auth-manager';

interface ErrorResponse {
  error: string;
  message: string;
}

interface SignOutResponse {
  success: boolean;
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SignOutResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      error: 'METHOD_NOT_ALLOWED',
      message: 'Only POST method is allowed',
    });
  }

  try {
    const authManager = getAuthManager();
    await authManager.signOut();

    // Clear auth cookies
    res.setHeader('Set-Cookie', [
      '__session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict',
      'auth-uid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict',
    ]);

    return res.status(200).json({
      success: true,
      message: 'Successfully signed out',
    });
  } catch (error) {
    console.error('Sign out failed:', error);
    return res.status(500).json({
      error: 'SIGNOUT_FAILED',
      message: error instanceof Error ? error.message : 'Failed to sign out',
    });
  }
}
