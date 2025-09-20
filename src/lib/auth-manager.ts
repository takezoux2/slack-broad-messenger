import {
  User as FirebaseUser,
  signInWithCustomToken,
  signOut,
  onAuthStateChanged,
  UserCredential,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  DocumentReference,
} from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseFirestore } from './firebase';
import { SlackTokenInfo, testSlackConnection } from './slack';
import { User, createUser, validateUser } from './types/user';

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
 * Slack OAuth state for security
 */
export interface SlackOAuthState {
  uid: string;
  timestamp: number;
  redirectUrl?: string;
}

/**
 * Authentication error types
 */
export enum AuthErrorType {
  INVALID_TOKEN = 'invalid_token',
  TOKEN_EXPIRED = 'token_expired',
  USER_NOT_FOUND = 'user_not_found',
  PERMISSION_DENIED = 'permission_denied',
  SLACK_API_ERROR = 'slack_api_error',
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
    onAuthStateChanged(this.auth, async (firebaseUser) => {
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
    this.authStateListeners.forEach(listener => listener(newState));
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
   * Generates OAuth state for Slack authentication
   */
  public generateSlackOAuthState(redirectUrl?: string): string {
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser) {
      throw new AuthError(AuthErrorType.USER_NOT_FOUND, 'User must be signed in to start Slack OAuth');
    }

    const state: SlackOAuthState = {
      uid: firebaseUser.uid,
      timestamp: Date.now(),
      redirectUrl,
    };

    return Buffer.from(JSON.stringify(state)).toString('base64');
  }

  /**
   * Validates OAuth state from Slack callback
   */
  public validateSlackOAuthState(encodedState: string): SlackOAuthState {
    try {
      const stateJson = Buffer.from(encodedState, 'base64').toString('utf-8');
      const state: SlackOAuthState = JSON.parse(stateJson);

      // Check if state is expired (1 hour)
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - state.timestamp > oneHour) {
        throw new AuthError(AuthErrorType.TOKEN_EXPIRED, 'OAuth state has expired');
      }

      // Check if UIDs match
      const currentUser = this.auth.currentUser;
      if (!currentUser || currentUser.uid !== state.uid) {
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
   * Completes Slack OAuth and updates user profile
   */
  public async completeSlackOAuth(tokenInfo: SlackTokenInfo): Promise<User> {
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser) {
      throw new AuthError(AuthErrorType.USER_NOT_FOUND, 'User must be signed in to complete Slack OAuth');
    }

    try {
      // Test Slack connection
      const isValidToken = await testSlackConnection(tokenInfo.accessToken);
      if (!isValidToken) {
        throw new AuthError(AuthErrorType.SLACK_API_ERROR, 'Invalid Slack access token');
      }

      // Create or update user profile
      const userProfile = createUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        slackUserId: tokenInfo.userId || '',
        displayName: firebaseUser.displayName || tokenInfo.teamName || 'Unknown User',
        avatar: firebaseUser.photoURL || undefined,
        slackTeamId: tokenInfo.teamId,
        slackAccessToken: tokenInfo.accessToken,
        slackScope: tokenInfo.scope,
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
      console.error('Slack OAuth completion failed:', error);
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError(
        AuthErrorType.UNKNOWN_ERROR,
        `Failed to complete Slack OAuth: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      await setDoc(userRef, {
        ...user,
        updatedAt: Timestamp.now(),
      }, { merge: true });
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
   * Checks if user has valid Slack token
   */
  public async hasValidSlackToken(): Promise<boolean> {
    const userProfile = this.currentAuthState.userProfile;
    if (!userProfile?.slackAccessToken) {
      return false;
    }

    try {
      return await testSlackConnection(userProfile.slackAccessToken);
    } catch (error) {
      console.error('Slack token validation failed:', error);
      return false;
    }
  }

  /**
   * Gets user's Slack access token
   */
  public getSlackAccessToken(): string | null {
    return this.currentAuthState.userProfile?.slackAccessToken || null;
  }

  /**
   * Gets user's Slack team ID
   */
  public getSlackTeamId(): string | null {
    return this.currentAuthState.userProfile?.slackTeamId || null;
  }

  /**
   * Checks if user is authenticated and has Slack access
   */
  public isFullyAuthenticated(): boolean {
    const state = this.currentAuthState;
    return state.isAuthenticated && 
           state.userProfile !== null && 
           Boolean(state.userProfile.slackAccessToken);
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
