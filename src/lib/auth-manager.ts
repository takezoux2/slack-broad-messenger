import type { User as FirebaseUser } from 'firebase/auth';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
} from 'firebase/auth';
import type { DocumentReference } from 'firebase/firestore';
import { doc, getDoc, setDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from './firebase';
import type { User } from './types/user';
import { createUser, validateUser } from './types/user';

/**
 * Authentication state interface
 */
export interface AuthState {
  user: FirebaseUser | null;
  userProfile: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

/**
 * Google OAuth state for security
 */
export interface GoogleOAuthState {
  uid?: string;
  timestamp: number;
  redirectUrl?: string;
  nonce: string;
}

/**
 * Google OAuth token info
 */
export interface GoogleTokenInfo {
  email: string;
  displayName: string;
  googleUserId: string;
  photoURL?: string;
  idToken: string;
}

/**
 * Authentication error types
 */
export enum AuthErrorType {
  INVALID_TOKEN = 'invalid_token',
  TOKEN_EXPIRED = 'token_expired',
  USER_NOT_FOUND = 'user_not_found',
  PERMISSION_DENIED = 'permission_denied',
  GOOGLE_API_ERROR = 'google_api_error',
  VALIDATION_ERROR = 'validation_error',
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * Authentication error class
 */
export class AuthError extends Error {
  constructor(
    public type: AuthErrorType,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Authentication manager class
 */
export class AuthManager {
  private auth = getFirebaseAuth();
  private firestore = getFirebaseFirestore();
  private authStateListeners: ((state: AuthState) => void)[] = [];
  private currentAuthState: AuthState = {
    user: null,
    userProfile: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  };

  constructor() {
    // Set up Firebase Auth state listener
    onAuthStateChanged(this.auth, async firebaseUser => {
      await this.handleAuthStateChange(firebaseUser);
    });
  }

  /**
   * Handles Firebase Auth state changes
   */
  private async handleAuthStateChange(firebaseUser: FirebaseUser | null): Promise<void> {
    try {
      this.updateAuthState({
        user: firebaseUser,
        userProfile: null,
        isLoading: true,
        isAuthenticated: false,
        error: null,
      });

      if (firebaseUser) {
        // Load user profile from Firestore
        const userProfile = await this.getUserProfile(firebaseUser.uid);

        this.updateAuthState({
          user: firebaseUser,
          userProfile,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        });
      } else {
        this.updateAuthState({
          user: null,
          userProfile: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        });
      }
    } catch (error) {
      console.error('Auth state change error:', error);
      this.updateAuthState({
        user: firebaseUser,
        userProfile: null,
        isLoading: false,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : 'Authentication error',
      });
    }
  }

  /**
   * Updates the current auth state and notifies listeners
   */
  private updateAuthState(newState: AuthState): void {
    this.currentAuthState = newState;
    this.authStateListeners.forEach(listener => {
      listener(newState);
    });
  }

  /**
   * Subscribes to auth state changes
   */
  public onAuthStateChange(callback: (state: AuthState) => void): () => void {
    this.authStateListeners.push(callback);

    // Immediately call with current state
    callback(this.currentAuthState);

    // Return unsubscribe function
    return () => {
      const index = this.authStateListeners.indexOf(callback);
      if (index > -1) {
        this.authStateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Gets the current auth state
   */
  public getCurrentAuthState(): AuthState {
    return this.currentAuthState;
  }

  /**
   * Generates OAuth state for Google authentication
   */
  public generateGoogleOAuthState(redirectUrl?: string): string {
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser) {
      throw new AuthError(
        AuthErrorType.USER_NOT_FOUND,
        'User must be signed in to start Google OAuth'
      );
    }

    const state: GoogleOAuthState = {
      uid: firebaseUser.uid,
      timestamp: Date.now(),
      redirectUrl,
      nonce: Math.random().toString(36).substring(2, 15),
    };

    return Buffer.from(JSON.stringify(state)).toString('base64');
  }

  /**
   * Validates OAuth state from Google callback
   */
  public validateGoogleOAuthState(encodedState: string): GoogleOAuthState {
    try {
      const stateJson = Buffer.from(encodedState, 'base64').toString('utf-8');
      const state: GoogleOAuthState = JSON.parse(stateJson);

      // Check if state is expired (1 hour)
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - state.timestamp > oneHour) {
        throw new AuthError(AuthErrorType.TOKEN_EXPIRED, 'OAuth state has expired');
      }

      // Check if UIDs match (if uid is provided)
      const currentUser = this.auth.currentUser;
      if (state.uid && (!currentUser || currentUser.uid !== state.uid)) {
        throw new AuthError(AuthErrorType.PERMISSION_DENIED, 'OAuth state UID mismatch');
      }

      return state;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(AuthErrorType.INVALID_TOKEN, 'Invalid OAuth state');
    }
  }

  /**
   * Completes Google OAuth and updates user profile
   */
  public async completeGoogleOAuth(tokenInfo: GoogleTokenInfo): Promise<User> {
    try {
      // Create Firebase credential from Google ID token
      const credential = GoogleAuthProvider.credential(tokenInfo.idToken);

      // Sign in with the credential
      const userCredential = await signInWithCredential(this.auth, credential);
      const firebaseUser = userCredential.user;

      // Create or update user profile with Google data
      const userProfile = createUser({
        uid: firebaseUser.uid,
        email: tokenInfo.email,
        googleUserId: tokenInfo.googleUserId,
        displayName: tokenInfo.displayName,
        avatar: tokenInfo.photoURL || undefined,
        lastLoginAt: Timestamp.now(),
      });

      // Validate user profile
      const validation = validateUser(userProfile);
      if (!validation.isValid) {
        throw new AuthError(
          AuthErrorType.VALIDATION_ERROR,
          `User profile validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        );
      }

      // Save to Firestore
      await this.saveUserProfile(userProfile);

      // Update current auth state
      this.updateAuthState({
        ...this.currentAuthState,
        userProfile,
      });

      return userProfile;
    } catch (error) {
      console.error('Google OAuth completion failed:', error);
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        AuthErrorType.UNKNOWN_ERROR,
        `Failed to complete Google OAuth: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Gets user profile from Firestore
   */
  public async getUserProfile(uid: string): Promise<User | null> {
    try {
      const userRef = doc(this.firestore, 'users', uid);
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
      console.error('Failed to get user profile:', error);
      throw new AuthError(
        AuthErrorType.UNKNOWN_ERROR,
        `Failed to get user profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Saves user profile to Firestore
   */
  public async saveUserProfile(user: User): Promise<void> {
    try {
      const validation = validateUser(user);
      if (!validation.isValid) {
        throw new AuthError(
          AuthErrorType.VALIDATION_ERROR,
          `User profile validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        );
      }

      const userRef = doc(this.firestore, 'users', user.uid);
      await setDoc(
        userRef,
        {
          ...user,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Failed to save user profile:', error);
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        AuthErrorType.UNKNOWN_ERROR,
        `Failed to save user profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Updates user's last login time
   */
  public async updateLastLogin(): Promise<void> {
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser) {
      return;
    }

    try {
      const userRef = doc(this.firestore, 'users', firebaseUser.uid);
      await updateDoc(userRef, {
        lastLoginAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Failed to update last login:', error);
      // Don't throw error - this is not critical
    }
  }

  /**
   * Signs out the user
   */
  public async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Sign out failed:', error);
      throw new AuthError(
        AuthErrorType.UNKNOWN_ERROR,
        `Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Creates or updates user profile with Google account data
   */
  public async createOrUpdateGoogleUser(googleData: {
    uid: string;
    email: string;
    displayName: string;
    googleUserId: string;
    photoURL?: string;
  }): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.getUserProfile(googleData.uid);

      const userProfile = createUser({
        uid: googleData.uid,
        email: googleData.email,
        googleUserId: googleData.googleUserId,
        displayName: googleData.displayName,
        avatar: googleData.photoURL || undefined,
        lastLoginAt: Timestamp.now(),
        createdAt: existingUser?.createdAt || Timestamp.now(),
        preferences: existingUser?.preferences,
        settings: existingUser?.settings,
      });

      // Validate user profile
      const validation = validateUser(userProfile);
      if (!validation.isValid) {
        throw new AuthError(
          AuthErrorType.VALIDATION_ERROR,
          `User profile validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        );
      }

      // Save to Firestore
      await this.saveUserProfile(userProfile);

      return userProfile;
    } catch (error) {
      console.error('Failed to create/update Google user:', error);
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        AuthErrorType.UNKNOWN_ERROR,
        `Failed to create/update Google user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Checks if user is authenticated with Google
   */
  public isGoogleAuthenticated(): boolean {
    const state = this.currentAuthState;
    return (
      state.isAuthenticated && state.userProfile !== null && Boolean(state.userProfile.googleUserId)
    );
  }

  /**
   * Gets the user reference for Firestore operations
   */
  public getUserRef(): DocumentReference | null {
    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      return null;
    }
    return doc(this.firestore, 'users', uid);
  }

  /**
   * Verifies a Firebase ID token and returns the user profile
   * Note: This is a simplified version for development. In production,
   * you would use Firebase Admin SDK for proper token verification.
   */
  public async verifyTokenAndGetProfile(idToken: string): Promise<User | null> {
    try {
      // For development with emulator, we use a simplified approach
      // In production, you would use Firebase Admin SDK

      // Extract user info from token (this is simplified)
      // In a real implementation, you would verify the token properly
      const mockUserId = idToken.replace('Bearer ', '');

      // Get user profile from Firestore
      const userProfile = await this.getUserProfile(mockUserId);

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      return userProfile;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          throw new Error('Token expired');
        }
        if (error.message.includes('invalid')) {
          throw new Error('Invalid token');
        }
        if (error.message.includes('not found')) {
          throw new Error('User not found');
        }
      }
      throw new Error('Authentication failed');
    }
  }

  /**
   * Updates specific fields in a user's profile
   */
  public async updateUserProfile(uid: string, updates: Partial<User>): Promise<void> {
    try {
      const userRef = doc(this.firestore, 'users', uid);
      const updateData: Record<string, unknown> = {};

      // Only include fields that are allowed to be updated
      if (updates.displayName !== undefined) {
        updateData.displayName = updates.displayName;
      }

      if (updates.preferences !== undefined) {
        updateData.preferences = updates.preferences;
      }

      if (updates.settings !== undefined) {
        updateData.settings = updates.settings;
      }

      // Always update the lastLoginAt timestamp when profile is updated
      updateData.lastLoginAt = Timestamp.now();

      await updateDoc(userRef, updateData);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error('Failed to update user profile');
    }
  }
}

// Global instance
let authManagerInstance: AuthManager | null = null;

/**
 * Gets the global AuthManager instance
 */
export function getAuthManager(): AuthManager {
  if (!authManagerInstance) {
    authManagerInstance = new AuthManager();
  }
  return authManagerInstance;
}

/**
 * Resets the AuthManager instance (useful for testing)
 */
export function resetAuthManager(): void {
  authManagerInstance = null;
}
