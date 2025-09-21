'use client';

import { useState } from 'react';
import { ChannelList } from '../components/ChannelList';
import { DeliveryReport } from '../components/DeliveryReport';
import { MessageComposer } from '../components/MessageComposer';
import { useAuth } from '../components/providers/AuthProvider';

export default function Dashboard() {
  const { userProfile, isLoading, isAuthenticated, startGoogleAuth } = useAuth();
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

  // Not authenticated - show login
  if (!isAuthenticated || !userProfile) {
    return (
      <div className='max-w-md mx-auto text-center'>
        <div className='bg-white shadow-sm rounded-lg p-8'>
          <h2 className='text-2xl font-bold text-gray-900 mb-4'>
            Welcome to Slack Broad Messenger
          </h2>
          <p className='text-gray-600 mb-6'>
            Send messages to multiple Slack channels at once. Sign in with Google to get started.
          </p>
          <button
            type='button'
            onClick={async () => {
              try {
                const authUrl = await startGoogleAuth();
                window.location.href = authUrl;
              } catch (error) {
                console.error('Failed to start Google auth:', error);
                alert('Failed to start authentication. Please try again.');
              }
            }}
            className='w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors'
          >
            Sign in with Google
          </button>
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
            <p className='text-gray-600'>Welcome back, {userProfile.displayName}</p>
          </div>
          <div className='text-sm text-gray-500'>
            <div>Email: {userProfile.email}</div>
            <div>Google ID: {userProfile.googleUserId}</div>
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
