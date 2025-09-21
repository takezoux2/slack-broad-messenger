'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { User } from '../../lib/types/user';
import { useFirebase } from './FirebaseProvider';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  startSlackAuth: () => Promise<string>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: User | null;
}

export function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const { auth, isInitialized } = useFirebase();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(initialUser || null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUserProfile = useCallback(async () => {
    const firebaseUser = auth?.currentUser;
    if (!firebaseUser) {
      setUserProfile(null);
      return;
    }

    try {
      // Call API to get user profile
      const response = await fetch('/api/auth/profile');
      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
      } else {
        console.error('Failed to fetch user profile');
        setUserProfile(null);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      setUserProfile(null);
    }
  }, [auth]);

  useEffect(() => {
    if (!auth || !isInitialized) return;

    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Only fetch profile if we don't have initial data
        if (!initialUser) {
          await refreshUserProfile();
        }
      } else {
        setUserProfile(null);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [auth, isInitialized, initialUser, refreshUserProfile]);

  const signOut = async () => {
    if (!auth) return;

    try {
      // Call API to handle server-side sign out
      await fetch('/api/auth/signout', { method: 'POST' });

      // Sign out from Firebase
      await auth.signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const startSlackAuth = async (): Promise<string> => {
    // Make API call to get Slack OAuth URL
    const response = await fetch('/api/auth/slack');
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to start Slack authentication');
    }

    return data.redirectUrl;
  };

  const value: AuthContextType = {
    user,
    userProfile,
    isLoading,
    isAuthenticated: !!user,
    signOut,
    startSlackAuth,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
