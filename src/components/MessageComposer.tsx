'use client';

import React, { useState, useEffect } from 'react';
import { UserSelector } from './UserSelector';

interface SlackUser {
  id: string;
  name: string;
  displayName: string;
  realName?: string;
  isActive: boolean;
  hasPostingPermission: boolean;
}

interface MessageComposerProps {
  selectedChannelListId: string | null;
  onMessageSent: (messageId: string) => void;
}

export function MessageComposer({ selectedChannelListId, onMessageSent }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [selectedSenderId, setSelectedSenderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<SlackUser[]>([]);
  const [showUserSelector, setShowUserSelector] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/slack-users');
      const data = await response.json();

      if (response.ok) {
        // Filter users that can post messages
        const eligibleUsers = data.users.filter(
          (user: any) => !user.deleted && !user.isBot && user.profile && !user.isRestricted
        );
        setUsers(eligibleUsers);
      } else {
        console.error('Failed to fetch users:', data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!content.trim()) {
      alert('Please enter a message');
      return;
    }

    if (!selectedChannelListId) {
      alert('Please select a channel list first');
      return;
    }

    if (!selectedSenderId) {
      alert('Please select a sender');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          channelListId: selectedChannelListId,
          selectedSenderId: selectedSenderId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onMessageSent(data.message.id);
        setContent('');
        alert('Message sent successfully!');
      } else {
        console.error('Failed to send message:', data);
        alert(data.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const getSelectedUser = () => {
    return users.find(user => user.id === selectedSenderId);
  };

  const characterCount = content.length;
  const maxCharacters = 4000; // Slack message limit

  return (
    <div className='bg-white shadow-sm rounded-lg p-6'>
      <h2 className='text-lg font-semibold text-gray-900 mb-4'>Compose Message</h2>

      {!selectedChannelListId && (
        <div className='mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md'>
          <p className='text-sm text-yellow-800'>
            Please select a channel list to compose a message.
          </p>
        </div>
      )}

      <div className='space-y-4'>
        {/* Sender Selection */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>Send as</label>
          <button
            onClick={() => setShowUserSelector(true)}
            disabled={!selectedChannelListId}
            className='w-full p-3 border border-gray-300 rounded-md text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed'
          >
            {selectedSenderId ? (
              <div className='flex items-center'>
                <div className='flex-1'>
                  <span className='font-medium'>{getSelectedUser()?.displayName}</span>
                  <span className='text-sm text-gray-500 ml-2'>@{getSelectedUser()?.name}</span>
                </div>
              </div>
            ) : (
              <span className='text-gray-500'>Select a user to send as...</span>
            )}
          </button>
        </div>

        {/* Message Content */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>Message</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder='Type your message here...'
            disabled={!selectedChannelListId}
            className='w-full px-3 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed'
            rows={6}
            maxLength={maxCharacters}
          />
          <div className='flex justify-between items-center mt-2'>
            <p className='text-xs text-gray-500'>
              Supports Slack formatting (bold, italic, links, etc.)
            </p>
            <p
              className={`text-xs ${characterCount > maxCharacters * 0.9 ? 'text-red-600' : 'text-gray-500'}`}
            >
              {characterCount}/{maxCharacters}
            </p>
          </div>
        </div>

        {/* Preview */}
        {content.trim() && (
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-2'>Preview</label>
            <div className='p-3 bg-gray-50 border border-gray-200 rounded-md'>
              <div className='flex items-start space-x-3'>
                <div className='w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium'>
                  {getSelectedUser()?.displayName?.[0] || '?'}
                </div>
                <div className='flex-1'>
                  <div className='flex items-center space-x-2'>
                    <span className='font-medium text-sm'>
                      {getSelectedUser()?.displayName || 'Unknown User'}
                    </span>
                    <span className='text-xs text-gray-500'>now</span>
                  </div>
                  <div className='mt-1 text-sm text-gray-900 whitespace-pre-wrap'>{content}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Send Button */}
        <button
          onClick={handleSendMessage}
          disabled={!selectedChannelListId || !content.trim() || !selectedSenderId || isLoading}
          className='w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors'
        >
          {isLoading ? (
            <span className='flex items-center justify-center'>
              <svg
                className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
                xmlns='http://www.w3.org/2000/svg'
                fill='none'
                viewBox='0 0 24 24'
              >
                <circle
                  className='opacity-25'
                  cx='12'
                  cy='12'
                  r='10'
                  stroke='currentColor'
                  strokeWidth='4'
                ></circle>
                <path
                  className='opacity-75'
                  fill='currentColor'
                  d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                ></path>
              </svg>
              Sending...
            </span>
          ) : (
            'Send Message'
          )}
        </button>
      </div>

      {showUserSelector && (
        <UserSelector
          users={users}
          selectedUserId={selectedSenderId}
          onUserSelect={userId => {
            setSelectedSenderId(userId);
            setShowUserSelector(false);
          }}
          onClose={() => setShowUserSelector(false)}
        />
      )}
    </div>
  );
}
