'use client';

import React, { useState } from 'react';
import { Channel } from '../lib/types/channel';

interface ChannelPickerProps {
  channels: Channel[];
  selectedChannelIds: string[];
  onSelectionChange: (channelIds: string[]) => void;
  onClose: () => void;
}

export function ChannelPicker({
  channels,
  selectedChannelIds,
  onSelectionChange,
  onClose,
}: ChannelPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Filter channels based on search term and archived status
  const filteredChannels = channels.filter(channel => {
    const matchesSearch =
      channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      channel.displayName.toLowerCase().includes(searchTerm.toLowerCase());
    const shouldShow = showArchived || !channel.isArchived;
    const isNotDeleted = !channel.isDeleted;

    return matchesSearch && shouldShow && isNotDeleted;
  });

  const handleChannelToggle = (channelId: string) => {
    const isSelected = selectedChannelIds.includes(channelId);

    if (isSelected) {
      onSelectionChange(selectedChannelIds.filter(id => id !== channelId));
    } else {
      if (selectedChannelIds.length >= 100) {
        alert('Maximum 100 channels allowed per list');
        return;
      }
      onSelectionChange([...selectedChannelIds, channelId]);
    }
  };

  const handleSelectAll = () => {
    const availableChannelIds = filteredChannels.map(c => c.id);
    const newSelection = [...new Set([...selectedChannelIds, ...availableChannelIds])];

    if (newSelection.length > 100) {
      alert('Maximum 100 channels allowed per list');
      return;
    }

    onSelectionChange(newSelection);
  };

  const handleDeselectAll = () => {
    const filteredChannelIds = filteredChannels.map(c => c.id);
    onSelectionChange(selectedChannelIds.filter(id => !filteredChannelIds.includes(id)));
  };

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
      <div className='bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col'>
        {/* Header */}
        <div className='flex items-center justify-between p-6 border-b'>
          <h2 className='text-lg font-semibold text-gray-900'>
            Select Channels ({selectedChannelIds.length}/100)
          </h2>
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

        {/* Search and filters */}
        <div className='p-4 border-b space-y-3'>
          <input
            type='text'
            placeholder='Search channels...'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          />

          <div className='flex items-center justify-between'>
            <label className='flex items-center'>
              <input
                type='checkbox'
                checked={showArchived}
                onChange={e => setShowArchived(e.target.checked)}
                className='mr-2'
              />
              <span className='text-sm text-gray-600'>Include archived channels</span>
            </label>

            <div className='space-x-2'>
              <button
                onClick={handleSelectAll}
                className='text-sm text-blue-600 hover:text-blue-800'
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                className='text-sm text-gray-600 hover:text-gray-800'
              >
                Deselect All
              </button>
            </div>
          </div>
        </div>

        {/* Channel list */}
        <div className='flex-1 overflow-y-auto p-4'>
          {filteredChannels.length === 0 ? (
            <p className='text-gray-500 text-center py-8'>
              No channels found matching your criteria.
            </p>
          ) : (
            <div className='space-y-2'>
              {filteredChannels.map(channel => {
                const isSelected = selectedChannelIds.includes(channel.id);

                return (
                  <div
                    key={channel.id}
                    className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleChannelToggle(channel.id)}
                  >
                    <input
                      type='checkbox'
                      checked={isSelected}
                      onChange={() => {}} // Handled by parent div onClick
                      className='mr-3'
                    />

                    <div className='flex-1'>
                      <div className='flex items-center'>
                        <span className='font-medium text-gray-900'>#{channel.name}</span>
                        {channel.isPrivate && (
                          <span className='ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded'>
                            Private
                          </span>
                        )}
                        {channel.isArchived && (
                          <span className='ml-2 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded'>
                            Archived
                          </span>
                        )}
                      </div>

                      {channel.purpose && (
                        <p className='text-sm text-gray-600 mt-1'>{channel.purpose}</p>
                      )}

                      <p className='text-xs text-gray-500 mt-1'>{channel.memberCount} members</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='flex items-center justify-between p-6 border-t'>
          <p className='text-sm text-gray-600'>{selectedChannelIds.length} channels selected</p>

          <div className='space-x-3'>
            <button
              onClick={onClose}
              className='px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className='px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
