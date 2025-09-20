'use client';

import React, { useState, useEffect } from 'react';
import { Message, MessageStatus } from '../lib/types/message';
import { MessageDelivery, DeliveryStatus } from '../lib/types/message-delivery';

interface DeliveryReportProps {
  messageId: string | null;
}

export function DeliveryReport({ messageId }: DeliveryReportProps) {
  const [message, setMessage] = useState<Message | null>(null);
  const [deliveries, setDeliveries] = useState<MessageDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (messageId) {
      fetchMessageDetails(messageId);
      fetchDeliveries(messageId);

      // Set up polling for live updates during sending
      const interval = setInterval(() => {
        if (message?.status === MessageStatus.SENDING) {
          fetchMessageDetails(messageId);
          fetchDeliveries(messageId);
        }
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    } else {
      setMessage(null);
      setDeliveries([]);
      setError(null);
    }
  }, [messageId, message?.status]);

  const fetchMessageDetails = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/messages/${id}`);
      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
      } else {
        setError(data.message || 'Failed to fetch message details');
      }
    } catch (error) {
      console.error('Error fetching message:', error);
      setError('Failed to fetch message details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDeliveries = async (id: string) => {
    try {
      const response = await fetch(`/api/messages/${id}/deliveries`);
      const data = await response.json();

      if (response.ok) {
        setDeliveries(data.deliveries);
      } else {
        console.error('Failed to fetch deliveries:', data);
      }
    } catch (error) {
      console.error('Error fetching deliveries:', error);
    }
  };

  const getStatusIcon = (status: DeliveryStatus) => {
    switch (status) {
      case DeliveryStatus.SUCCESS:
        return (
          <svg className='w-5 h-5 text-green-600' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
              clipRule='evenodd'
            />
          </svg>
        );
      case DeliveryStatus.FAILED:
        return (
          <svg className='w-5 h-5 text-red-600' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
              clipRule='evenodd'
            />
          </svg>
        );
      case DeliveryStatus.SKIPPED:
        return (
          <svg className='w-5 h-5 text-yellow-600' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
              clipRule='evenodd'
            />
          </svg>
        );
      case DeliveryStatus.PENDING:
      default:
        return (
          <svg className='w-5 h-5 text-gray-400 animate-spin' fill='none' viewBox='0 0 24 24'>
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
        );
    }
  };

  const getStatusText = (status: DeliveryStatus) => {
    switch (status) {
      case DeliveryStatus.SUCCESS:
        return 'Delivered';
      case DeliveryStatus.FAILED:
        return 'Failed';
      case DeliveryStatus.SKIPPED:
        return 'Skipped';
      case DeliveryStatus.PENDING:
      default:
        return 'Pending';
    }
  };

  const getStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case DeliveryStatus.SUCCESS:
        return 'text-green-600';
      case DeliveryStatus.FAILED:
        return 'text-red-600';
      case DeliveryStatus.SKIPPED:
        return 'text-yellow-600';
      case DeliveryStatus.PENDING:
      default:
        return 'text-gray-500';
    }
  };

  const calculateProgress = () => {
    if (!message || message.totalChannels === 0) return 0;
    const completed = message.successCount + message.failureCount + message.skipCount;
    return Math.round((completed / message.totalChannels) * 100);
  };

  if (!messageId) {
    return (
      <div className='bg-white shadow-sm rounded-lg p-6'>
        <h2 className='text-lg font-semibold text-gray-900 mb-4'>Delivery Report</h2>
        <div className='text-center py-8'>
          <svg
            className='w-12 h-12 text-gray-400 mx-auto mb-4'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
            />
          </svg>
          <p className='text-gray-500'>Send a message to see delivery report</p>
        </div>
      </div>
    );
  }

  if (isLoading && !message) {
    return (
      <div className='bg-white shadow-sm rounded-lg p-6'>
        <h2 className='text-lg font-semibold text-gray-900 mb-4'>Delivery Report</h2>
        <div className='animate-pulse space-y-3'>
          <div className='h-4 bg-gray-200 rounded w-3/4'></div>
          <div className='h-4 bg-gray-200 rounded w-1/2'></div>
          <div className='h-4 bg-gray-200 rounded w-2/3'></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='bg-white shadow-sm rounded-lg p-6'>
        <h2 className='text-lg font-semibold text-gray-900 mb-4'>Delivery Report</h2>
        <div className='text-center py-8'>
          <svg
            className='w-12 h-12 text-red-400 mx-auto mb-4'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
          <p className='text-red-600 mb-2'>Error loading delivery report</p>
          <p className='text-gray-500 text-sm'>{error}</p>
        </div>
      </div>
    );
  }

  if (!message) {
    return null;
  }

  const progress = calculateProgress();

  return (
    <div className='bg-white shadow-sm rounded-lg p-6'>
      <h2 className='text-lg font-semibold text-gray-900 mb-4'>Delivery Report</h2>

      {/* Message Summary */}
      <div className='mb-6 p-4 bg-gray-50 rounded-lg'>
        <div className='flex items-center justify-between mb-3'>
          <span className='text-sm font-medium text-gray-700'>Status:</span>
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              message.status === MessageStatus.COMPLETED
                ? 'bg-green-100 text-green-800'
                : message.status === MessageStatus.SENDING
                  ? 'bg-blue-100 text-blue-800'
                  : message.status === MessageStatus.FAILED
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
            }`}
          >
            {message.status.charAt(0).toUpperCase() + message.status.slice(1)}
          </span>
        </div>

        {/* Progress Bar */}
        <div className='mb-3'>
          <div className='flex justify-between text-sm text-gray-600 mb-1'>
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className='w-full bg-gray-200 rounded-full h-2'>
            <div
              className='bg-blue-600 h-2 rounded-full transition-all duration-300'
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Counts */}
        <div className='grid grid-cols-4 gap-4 text-center text-sm'>
          <div>
            <div className='font-semibold text-gray-900'>{message.totalChannels}</div>
            <div className='text-gray-500'>Total</div>
          </div>
          <div>
            <div className='font-semibold text-green-600'>{message.successCount}</div>
            <div className='text-gray-500'>Success</div>
          </div>
          <div>
            <div className='font-semibold text-red-600'>{message.failureCount}</div>
            <div className='text-gray-500'>Failed</div>
          </div>
          <div>
            <div className='font-semibold text-yellow-600'>{message.skipCount}</div>
            <div className='text-gray-500'>Skipped</div>
          </div>
        </div>
      </div>

      {/* Delivery Details */}
      <div>
        <h3 className='text-md font-medium text-gray-900 mb-3'>Channel Details</h3>

        {deliveries.length === 0 ? (
          <p className='text-gray-500 text-sm'>No delivery details available yet.</p>
        ) : (
          <div className='space-y-2 max-h-64 overflow-y-auto'>
            {deliveries.map(delivery => (
              <div
                key={delivery.id}
                className='flex items-center justify-between p-3 border border-gray-200 rounded-lg'
              >
                <div className='flex items-center space-x-3'>
                  {getStatusIcon(delivery.status)}
                  <div>
                    <span className='font-medium text-gray-900'>#{delivery.channelName}</span>
                    {delivery.errorMessage && (
                      <p className='text-sm text-red-600 mt-1'>{delivery.errorMessage}</p>
                    )}
                  </div>
                </div>

                <div className='text-right'>
                  <span className={`text-sm font-medium ${getStatusColor(delivery.status)}`}>
                    {getStatusText(delivery.status)}
                  </span>
                  {delivery.retryCount > 0 && (
                    <p className='text-xs text-gray-500'>{delivery.retryCount} retries</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
