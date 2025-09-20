'use client';

import React, { useState } from 'react';

interface SlackUser {
  id: string;
  name: string;
  displayName: string;
  realName?: string;
  profile?: {
    image_24?: string;
    image_32?: string;
    title?: string;
    email?: string;
  };
  isActive: boolean;
}

interface UserSelectorProps {
  users: SlackUser[];
  selectedUserId: string | null;
  onUserSelect: (userId: string) => void;
  onClose: () => void;
}

export function UserSelector({ users, selectedUserId, onUserSelect, onClose }: UserSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter users based on search term
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.displayName.toLowerCase().includes(searchLower) ||
      user.name.toLowerCase().includes(searchLower) ||
      (user.realName && user.realName.toLowerCase().includes(searchLower)) ||
      (user.profile?.email && user.profile.email.toLowerCase().includes(searchLower))
    );
  });

  const handleUserSelect = (userId: string) => {
    onUserSelect(userId);
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[70vh] flex flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b'>
          <h2 className='text-lg font-semibold text-gray-900'>Select User to Send As</h2>
          <button onClick={onClose} className='text-gray-400 hover:text-gray-600'>
            <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className='p-4 border-b'>
          <input
            type='text'
            placeholder='Search users...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          />
        </div>

        {/* User list */}
        <div className='flex-1 overflow-y-auto p-4'>
          {filteredUsers.length === 0 ? (
            <p className='text-gray-500 text-center py-8'>No users found matching your search.</p>
          ) : (
            <div className='space-y-2'>
              {filteredUsers.map(user => {
                const isSelected = selectedUserId === user.id;

                return (
                  <div
                    key={user.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleUserSelect(user.id)}
                  >
                    {/* Avatar */}
                    <div className='w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium mr-3'>
                      {user.profile?.image_32 ? (
                        <img
                          src={user.profile.image_32}
                          alt={user.displayName}
                          className='w-10 h-10 rounded-full'
                        />
                      ) : (
                        user.displayName[0]?.toUpperCase() || '?'
                      )}
                    </div>

                    {/* User info */}
                    <div className='flex-1'>
                      <div className='flex items-center'>
                        <span className='font-medium text-gray-900'>{user.displayName}</span>
                        {!user.isActive && (
                          <span className='ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded'>
                            Away
                          </span>
                        )}
                      </div>

                      <div className='text-sm text-gray-600'>@{user.name}</div>

                      {user.realName && user.realName !== user.displayName && (
                        <div className='text-xs text-gray-500'>{user.realName}</div>
                      )}

                      {user.profile?.title && (
                        <div className='text-xs text-gray-500'>{user.profile.title}</div>
                      )}
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className='text-blue-600'>
                        <svg className='w-5 h-5' fill='currentColor' viewBox='0 0 20 20'>
                          <path
                            fillRule='evenodd'
                            d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                            clipRule='evenodd'
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='flex items-center justify-between p-6 border-t'>
          <p className='text-sm text-gray-600'>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} available
          </p>

          <button
            onClick={onClose}
            className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
