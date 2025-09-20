'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { useFirebase } from './FirebaseProvider';
import { AuthManager } from '../../lib/auth-manager';
import { User } from '../../lib/types/user';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  startSlackAuth: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { auth, isInitialized } = useFirebase();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth || !isInitialized) return;

    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const authManager = new AuthManager();
          const profile = await authManager.getUserProfile(firebaseUser.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error('Failed to load user profile:', error);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }

      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [auth, isInitialized]);

  const signOut = async () => {
    if (!auth) return;

    try {
      const authManager = new AuthManager();
      await authManager.signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  const startSlackAuth = async (): Promise<string> => {
    const authManager = new AuthManager();
    const state = authManager.generateSlackOAuthState();

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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
