'use client';

import { GoogleAuthProvider, getAuth, signInWithPopup } from 'firebase/auth';
import { useState } from 'react';
import { getFirebaseApp, getFirebaseAuth } from '@/lib/firebase';
import { ChannelList } from '../components/ChannelList';
import { DeliveryReport } from '../components/DeliveryReport';
import { MessageComposer } from '../components/MessageComposer';
import { useAuth } from '../components/providers/AuthProvider';

export default function Dashboard() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [selectedChannelListId, setSelectedChannelListId] = useState<string | null>(null);
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);

  // Loading state
  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-[50vh]'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600'>Loading...</p>
        </div>
      </div>
    );
  }

  // Authenticated dashboard
  return (
    <div className='space-y-8'>
      {/* Header */}
      <div className='bg-white shadow-sm rounded-lg p-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Dashboard</h1>
            <p className='text-gray-600'>Welcome back, {user?.displayName}</p>
          </div>
          <div className='flex items-center gap-4'>
            <div className='text-sm text-gray-500'>
              <div>Email: {user?.email}</div>
              <div>Google ID: {user?.uid}</div>
            </div>
            <button
              type='button'
              onClick={async () => {
                try {
                  await fetch('/api/auth/signout', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  });
                  getFirebaseAuth().signOut();
                  // Reload the page to refresh the authentication state
                  window.location.reload();
                } catch (error) {
                  console.error('Sign out error:', error);
                }
              }}
              className='bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors text-sm'
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
        {/* Channel Lists */}
        <div className='lg:col-span-1'>
          <ChannelList
            selectedChannelListId={selectedChannelListId}
            onSelectChannelList={setSelectedChannelListId}
          />
        </div>

        {/* Message Composer */}
        <div className='lg:col-span-1'>
          <MessageComposer
            selectedChannelListId={selectedChannelListId}
            onMessageSent={(messageId: string) => {
              setCurrentMessageId(messageId);
            }}
          />
        </div>

        {/* Delivery Report */}
        <div className='lg:col-span-1'>
          <DeliveryReport messageId={currentMessageId} />
        </div>
      </div>
    </div>
  );
}
