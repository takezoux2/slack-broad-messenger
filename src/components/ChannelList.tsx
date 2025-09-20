'use client';

import React, { useState, useEffect } from 'react';
import { ChannelList as ChannelListType } from '../lib/types/channel-list';
import { Channel } from '../lib/types/channel';
import { ChannelPicker } from './ChannelPicker';

interface ChannelListProps {
  selectedChannelListId: string | null;
  onSelectChannelList: (id: string | null) => void;
}

export function ChannelList({ selectedChannelListId, onSelectChannelList }: ChannelListProps) {
  const [channelLists, setChannelLists] = useState<ChannelListType[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showChannelPicker, setShowChannelPicker] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);

  useEffect(() => {
    fetchChannelLists();
    fetchChannels();
  }, []);

  const fetchChannelLists = async () => {
    try {
      const response = await fetch('/api/channel-lists');
      const data = await response.json();

      if (response.ok) {
        setChannelLists(data.channelLists);
      } else {
        console.error('Failed to fetch channel lists:', data);
      }
    } catch (error) {
      console.error('Error fetching channel lists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/channels');
      const data = await response.json();

      if (response.ok) {
        setChannels(data.channels);
      } else {
        console.error('Failed to fetch channels:', data);
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  const handleCreateList = async () => {
    if (!newListName.trim() || selectedChannels.length === 0) {
      alert('Please provide a name and select at least one channel');
      return;
    }

    try {
      const response = await fetch('/api/channel-lists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newListName,
          description: newListDescription,
          channelIds: selectedChannels,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setChannelLists([...channelLists, data.channelList]);
        setNewListName('');
        setNewListDescription('');
        setSelectedChannels([]);
        setIsCreating(false);
        setShowChannelPicker(false);
      } else {
        console.error('Failed to create channel list:', data);
        alert(data.message || 'Failed to create channel list');
      }
    } catch (error) {
      console.error('Error creating channel list:', error);
      alert('Failed to create channel list');
    }
  };

  const handleDeleteList = async (listId: string) => {
    if (!confirm('Are you sure you want to delete this channel list?')) {
      return;
    }

    try {
      const response = await fetch(`/api/channel-lists/${listId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setChannelLists(channelLists.filter(list => list.id !== listId));
        if (selectedChannelListId === listId) {
          onSelectChannelList(null);
        }
      } else {
        const data = await response.json();
        console.error('Failed to delete channel list:', data);
        alert(data.message || 'Failed to delete channel list');
      }
    } catch (error) {
      console.error('Error deleting channel list:', error);
      alert('Failed to delete channel list');
    }
  };

  const getChannelNames = (channelIds: string[]) => {
    return channelIds
      .map(id => channels.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  if (isLoading) {
    return (
      <div className='bg-white shadow-sm rounded-lg p-6'>
        <h2 className='text-lg font-semibold text-gray-900 mb-4'>Channel Lists</h2>
        <div className='animate-pulse space-y-3'>
          <div className='h-4 bg-gray-200 rounded w-3/4'></div>
          <div className='h-4 bg-gray-200 rounded w-1/2'></div>
          <div className='h-4 bg-gray-200 rounded w-2/3'></div>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-white shadow-sm rounded-lg p-6'>
      <div className='flex items-center justify-between mb-4'>
        <h2 className='text-lg font-semibold text-gray-900'>Channel Lists</h2>
        <button
          onClick={() => setIsCreating(true)}
          className='bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
        >
          Create New
        </button>
      </div>

      {isCreating && (
        <div className='mb-4 p-4 border border-gray-200 rounded-lg'>
          <h3 className='font-medium text-gray-900 mb-3'>Create New Channel List</h3>
          <div className='space-y-3'>
            <input
              type='text'
              placeholder='List name'
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            />
            <textarea
              placeholder='Description (optional)'
              value={newListDescription}
              onChange={e => setNewListDescription(e.target.value)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              rows={2}
            />
            <button
              onClick={() => setShowChannelPicker(true)}
              className='w-full px-3 py-2 border border-gray-300 rounded-md text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            >
              {selectedChannels.length > 0
                ? `${selectedChannels.length} channels selected`
                : 'Select channels...'}
            </button>
            <div className='flex space-x-2'>
              <button
                onClick={handleCreateList}
                disabled={!newListName.trim() || selectedChannels.length === 0}
                className='flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed'
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewListName('');
                  setNewListDescription('');
                  setSelectedChannels([]);
                }}
                className='flex-1 bg-gray-300 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className='space-y-2'>
        {channelLists.length === 0 ? (
          <p className='text-gray-500 text-sm'>No channel lists created yet.</p>
        ) : (
          channelLists.map(list => (
            <div
              key={list.id}
              className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedChannelListId === list.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onSelectChannelList(list.id)}
            >
              <div className='flex items-center justify-between'>
                <div className='flex-1'>
                  <h3 className='font-medium text-gray-900'>{list.name}</h3>
                  {list.description && (
                    <p className='text-sm text-gray-600 mt-1'>{list.description}</p>
                  )}
                  <p className='text-xs text-gray-500 mt-1'>
                    {list.channelCount} channels: {getChannelNames(list.channelIds)}
                  </p>
                </div>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleDeleteList(list.id);
                  }}
                  className='text-red-600 hover:text-red-800 text-sm'
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showChannelPicker && (
        <ChannelPicker
          channels={channels}
          selectedChannelIds={selectedChannels}
          onSelectionChange={setSelectedChannels}
          onClose={() => setShowChannelPicker(false)}
        />
      )}
    </div>
  );
}
