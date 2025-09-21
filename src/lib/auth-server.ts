import { doc, getDoc } from 'firebase/firestore';
import { cookies } from 'next/headers';
import { AuthError, AuthErrorType } from './auth-manager';
import { getFirebaseFirestore } from './firebase';
import type { User } from './types/user';
import { createUser, validateUser } from './types/user';

/**
 * Server-side authentication result
 */
export interface ServerAuthResult {
  isAuthenticated: boolean;
  user: User | null;
  uid: string | null;
  error?: string;
}

/**
 * Gets authentication state from server components
 * This function can only be used in Server Components
 */
export async function getServerAuth(): Promise<ServerAuthResult> {
  try {
    // In server components, we need to get the user from cookies or session
    // For now, we'll implement a basic version that checks for auth cookies
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session');

    if (!sessionCookie) {
      return {
        isAuthenticated: false,
        user: null,
        uid: null,
      };
    }

    // Here we would normally verify the session token
    // For this implementation, we'll use a simplified approach
    const uidCookie = cookieStore.get('auth-uid');

    if (!uidCookie?.value) {
      return {
        isAuthenticated: false,
        user: null,
        uid: null,
      };
    }

    // Get user profile from Firestore
    const userProfile = await getServerUserProfile(uidCookie.value);

    return {
      isAuthenticated: true,
      user: userProfile,
      uid: uidCookie.value,
    };
  } catch (error) {
    console.error('Server auth check failed:', error);
    return {
      isAuthenticated: false,
      user: null,
      uid: null,
      error: error instanceof Error ? error.message : 'Authentication error',
    };
  }
}

/**
 * Gets user profile from Firestore (server-side)
 */
export async function getServerUserProfile(uid: string): Promise<User | null> {
  try {
    const firestore = getFirebaseFirestore();
    const userRef = doc(firestore, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const userData = userSnap.data();
    const user = createUser({
      uid,
      ...userData,
    });

    // Validate user data
    const validation = validateUser(user);
    if (!validation.isValid) {
      console.warn('Invalid user data in Firestore:', validation.errors);
      return null;
    }

    return user;
  } catch (error) {
    console.error('Failed to get user profile from server:', error);
    throw new AuthError(
      AuthErrorType.UNKNOWN_ERROR,
      `Failed to get user profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error
    );
  }
}

/**
 * Checks if user has valid Slack token (server-side)
 */
export async function serverHasValidSlackToken(uid: string): Promise<boolean> {
  try {
    const userProfile = await getServerUserProfile(uid);
    return !!userProfile?.slackAccessToken;
  } catch (error) {
    console.error('Server Slack token validation failed:', error);
    return false;
  }
}

/**
 * Gets user's Slack access token (server-side)
 */
export async function getServerSlackAccessToken(uid: string): Promise<string | null> {
  try {
    const userProfile = await getServerUserProfile(uid);
    return userProfile?.slackAccessToken || null;
  } catch (error) {
    console.error('Failed to get Slack access token from server:', error);
    return null;
  }
}

/**
 * Gets user's Slack team ID (server-side)
 */
export async function getServerSlackTeamId(uid: string): Promise<string | null> {
  try {
    const userProfile = await getServerUserProfile(uid);
    return userProfile?.slackTeamId || null;
  } catch (error) {
    console.error('Failed to get Slack team ID from server:', error);
    return null;
  }
}

/**
 * Checks if user is fully authenticated with Slack (server-side)
 */
export async function serverIsFullyAuthenticated(uid: string): Promise<boolean> {
  try {
    const userProfile = await getServerUserProfile(uid);
    return !!(userProfile?.slackAccessToken && userProfile?.slackTeamId);
  } catch (error) {
    console.error('Server full authentication check failed:', error);
    return false;
  }
}
