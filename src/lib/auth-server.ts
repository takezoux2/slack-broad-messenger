import { doc, getDoc } from 'firebase/firestore';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { AuthError, AuthErrorType } from './auth-manager';
import { getFirebaseFirestore } from './firebase';
import { adminAuth } from './firebase-admin';
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
 * Result from session token verification
 */
export interface SessionVerificationResult {
  uid: string;
  email: string;
  emailVerified: boolean;
  customClaims: Record<string, unknown>;
}

/**
 * Extracts and verifies session token from cookies using Firebase Admin
 */
export async function verifySessionToken(request: NextRequest): Promise<SessionVerificationResult> {
  try {
    // Get session cookie
    const sessionCookie = request.cookies.get('session')?.value;

    if (!sessionCookie) {
      throw new Error('No session cookie found');
    }

    // Verify session cookie using Firebase Admin
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      emailVerified: decodedToken.email_verified || false,
      customClaims: (decodedToken.custom_claims || {}) as Record<string, unknown>,
    };
  } catch (error) {
    console.error('Session token verification failed:', error);
    throw new Error('Invalid or expired session');
  }
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
 * Checks if user has valid Google authentication (server-side)
 */
export async function serverHasValidGoogleAuth(uid: string): Promise<boolean> {
  try {
    const userProfile = await getServerUserProfile(uid);
    return !!userProfile?.googleUserId;
  } catch (error) {
    console.error('Server Google auth validation failed:', error);
    return false;
  }
}

/**
 * Gets user's Google user ID (server-side)
 */
export async function getServerGoogleUserId(uid: string): Promise<string | null> {
  try {
    const userProfile = await getServerUserProfile(uid);
    return userProfile?.googleUserId || null;
  } catch (error) {
    console.error('Failed to get Google user ID from server:', error);
    return null;
  }
}

/**
 * Checks if user is fully authenticated with Google (server-side)
 */
export async function serverIsFullyAuthenticated(uid: string): Promise<boolean> {
  try {
    const userProfile = await getServerUserProfile(uid);
    return !!userProfile?.googleUserId;
  } catch (error) {
    console.error('Server full authentication check failed:', error);
    return false;
  }
}
