'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect } from 'react';
import { useAuth } from '../../components/providers/AuthProvider';

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // If already authenticated, redirect to dashboard
    if (!isLoading && isAuthenticated) {
      router.push('/');
      return;
    }

    // Handle OAuth callback if search params exist
    if (searchParams) {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        console.error('OAuth error:', error);
        // Handle OAuth error - could show an error message or redirect
        return;
      }

      if (code && state) {
        // Handle Google OAuth callback
        handleOAuthCallback(code, state);
      }
    }
  }, [isLoading, isAuthenticated, searchParams, router]);

  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      const response = await fetch(`/api/auth/google/callback?code=${code}&state=${state}`);
      const data = await response.json();

      if (response.ok) {
        // Success - redirect to dashboard
        router.push('/');
      } else {
        console.error('OAuth callback failed:', data);
        // Handle error
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      // Handle error
    }
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[50vh]'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>Processing authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='max-w-md mx-auto text-center'>
      <div className='bg-white shadow-sm rounded-lg p-8'>
        <h2 className='text-2xl font-bold text-gray-900 mb-4'>Authentication</h2>
        <p className='text-gray-600'>Processing your Google authentication...</p>
      </div>
    </div>
  );
}
