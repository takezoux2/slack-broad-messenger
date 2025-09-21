/**
 * Validation utilities for all data types
 * Centralized validation logic used throughout the application
 */

import { Timestamp } from 'firebase/firestore';
import { ChannelList } from './types/channel-list';
import { Message, MessageStatus } from './types/message';
import { DeliveryStatus, MessageDelivery } from './types/message-delivery';
import { User } from './types/user';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Email validation using RFC 5322 compliant regex
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;

  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email);
}

/**
 * Slack channel ID validation (format: C + 10 alphanumeric characters)
 */
export function isValidSlackChannelId(channelId: string): boolean {
  if (!channelId || typeof channelId !== 'string') return false;

  const channelIdRegex = /^C[A-Z0-9]{10}$/;
  return channelIdRegex.test(channelId);
}

/**
 * Slack user ID validation (format: U + 10 alphanumeric characters)
 */
export function isValidSlackUserId(userId: string): boolean {
  if (!userId || typeof userId !== 'string') return false;

  const userIdRegex = /^U[A-Z0-9]{10}$/;
  return userIdRegex.test(userId);
}

/**
 * Sanitize channel name by removing # prefix
 */
export function sanitizeChannelName(channelName: string): string {
  if (!channelName || typeof channelName !== 'string') return '';

  return channelName.startsWith('#') ? channelName.slice(1) : channelName;
}

/**
 * Validate message content
 */
export function validateMessageContent(content: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!content || typeof content !== 'string') {
    errors.push({
      field: 'content',
      message: 'Message content is required',
    });
    return { isValid: false, errors };
  }

  if (content.trim().length === 0) {
    errors.push({
      field: 'content',
      message: 'Message content cannot be only whitespace',
    });
  }

  if (content.length > 4000) {
    errors.push({
      field: 'content',
      message: 'Message content must not exceed 4000 characters',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate User object
 */
export function validateUser(user: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!user || typeof user !== 'object') {
    errors.push({
      field: 'user',
      message: 'User object is required',
    });
    return { isValid: false, errors };
  }

  // Required field validations
  if (!user.uid || typeof user.uid !== 'string' || user.uid.trim() === '') {
    errors.push({
      field: 'uid',
      message: 'uid must be a valid Firebase Auth UID',
    });
  }

  if (!user.email || typeof user.email !== 'string' || !isValidEmail(user.email)) {
    errors.push({
      field: 'email',
      message: 'email must be a valid email format',
    });
  }

  if (
    !user.googleUserId ||
    typeof user.googleUserId !== 'string' ||
    user.googleUserId.trim() === ''
  ) {
    errors.push({
      field: 'googleUserId',
      message: 'googleUserId is required and must be a non-empty string',
    });
  }

  if (!user.displayName || typeof user.displayName !== 'string' || user.displayName.trim() === '') {
    errors.push({
      field: 'displayName',
      message: 'displayName is required and must be 1-100 characters',
    });
  } else if (user.displayName.length > 100) {
    errors.push({
      field: 'displayName',
      message: 'displayName is required and must be 1-100 characters',
    });
  }

  if (typeof user.isActive !== 'boolean') {
    errors.push({
      field: 'isActive',
      message: 'isActive must be a boolean value',
    });
  }

  // Optional avatar validation
  if (user.avatar !== undefined) {
    if (typeof user.avatar !== 'string' || user.avatar.trim() === '') {
      errors.push({
        field: 'avatar',
        message: 'avatar must be a non-empty string if provided',
      });
    }
  }

  // Timestamp validations
  if (!(user.createdAt instanceof Timestamp)) {
    errors.push({
      field: 'createdAt',
      message: 'createdAt must be a Firebase Timestamp',
    });
  }

  if (!(user.lastLoginAt instanceof Timestamp)) {
    errors.push({
      field: 'lastLoginAt',
      message: 'lastLoginAt must be a Firebase Timestamp',
    });
  }

  // Preferences validation
  if (user.preferences && typeof user.preferences !== 'object') {
    errors.push({
      field: 'preferences',
      message: 'preferences must be a valid object',
    });
  }

  // Settings validation
  if (user.settings && typeof user.settings !== 'object') {
    errors.push({
      field: 'settings',
      message: 'settings must be a valid object',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate ChannelList object
 */
export function validateChannelList(channelList: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!channelList || typeof channelList !== 'object') {
    errors.push({
      field: 'channelList',
      message: 'Channel list object is required',
    });
    return { isValid: false, errors };
  }

  // Required field validations
  if (!channelList.id || typeof channelList.id !== 'string' || channelList.id.trim() === '') {
    errors.push({
      field: 'id',
      message: 'Channel list ID is required',
    });
  }

  if (
    !channelList.ownerId ||
    typeof channelList.ownerId !== 'string' ||
    channelList.ownerId.trim() === ''
  ) {
    errors.push({
      field: 'ownerId',
      message: 'Owner ID is required',
    });
  }

  if (!channelList.name || typeof channelList.name !== 'string' || channelList.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Channel list name is required',
    });
  } else if (channelList.name.length > 100) {
    errors.push({
      field: 'name',
      message: 'Channel list name must not exceed 100 characters',
    });
  }

  if (!Array.isArray(channelList.channelIds)) {
    errors.push({
      field: 'channelIds',
      message: 'channelIds must be an array',
    });
  } else {
    if (channelList.channelIds.length > 100) {
      errors.push({
        field: 'channelIds',
        message: 'Channel list cannot contain more than 100 channels',
      });
    }

    // Validate each channel ID
    const invalidChannels = channelList.channelIds.filter(
      (id: any) => typeof id !== 'string' || !isValidSlackChannelId(id)
    );

    if (invalidChannels.length > 0) {
      errors.push({
        field: 'channelIds',
        message: 'All channel IDs must be valid Slack channel IDs',
      });
    }
  }

  if (typeof channelList.channelCount !== 'number' || channelList.channelCount < 0) {
    errors.push({
      field: 'channelCount',
      message: 'Channel count must be a non-negative number',
    });
  } else if (
    Array.isArray(channelList.channelIds) &&
    channelList.channelCount !== channelList.channelIds.length
  ) {
    errors.push({
      field: 'channelCount',
      message: 'Channel count must match the number of channel IDs',
    });
  }

  if (typeof channelList.isActive !== 'boolean') {
    errors.push({
      field: 'isActive',
      message: 'isActive must be a boolean',
    });
  }

  // Timestamp validations
  if (!(channelList.createdAt instanceof Timestamp)) {
    errors.push({
      field: 'createdAt',
      message: 'createdAt must be a Firebase Timestamp',
    });
  }

  if (!(channelList.updatedAt instanceof Timestamp)) {
    errors.push({
      field: 'updatedAt',
      message: 'updatedAt must be a Firebase Timestamp',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Message object
 */
export function validateMessage(message: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!message || typeof message !== 'object') {
    errors.push({
      field: 'message',
      message: 'Message object is required',
    });
    return { isValid: false, errors };
  }

  // Required field validations
  if (!message.id || typeof message.id !== 'string' || message.id.trim() === '') {
    errors.push({
      field: 'id',
      message: 'Message ID is required',
    });
  }

  if (!message.senderId || typeof message.senderId !== 'string' || message.senderId.trim() === '') {
    errors.push({
      field: 'senderId',
      message: 'Sender ID is required',
    });
  }

  if (
    !message.selectedSenderId ||
    typeof message.selectedSenderId !== 'string' ||
    !isValidSlackUserId(message.selectedSenderId)
  ) {
    errors.push({
      field: 'selectedSenderId',
      message: 'Valid Slack user ID is required for selected sender',
    });
  }

  if (
    !message.channelListId ||
    typeof message.channelListId !== 'string' ||
    message.channelListId.trim() === ''
  ) {
    errors.push({
      field: 'channelListId',
      message: 'Channel list ID is required',
    });
  }

  // Content validation
  const contentValidation = validateMessageContent(message.content);
  if (!contentValidation.isValid) {
    errors.push(...contentValidation.errors);
  }

  // Status validation
  const validStatuses = Object.values(MessageStatus);
  if (!message.status || !validStatuses.includes(message.status)) {
    errors.push({
      field: 'status',
      message: 'Status must be one of: draft, sending, completed, failed',
    });
  }

  // Count validations
  const countFields = ['totalChannels', 'successCount', 'failureCount', 'skipCount'];
  countFields.forEach(field => {
    if (
      typeof message[field] !== 'number' ||
      message[field] < 0 ||
      !Number.isInteger(message[field])
    ) {
      errors.push({
        field,
        message: `${field} must be a non-negative integer`,
      });
    }
  });

  // Logical count validation
  if (
    typeof message.totalChannels === 'number' &&
    typeof message.successCount === 'number' &&
    typeof message.failureCount === 'number' &&
    typeof message.skipCount === 'number'
  ) {
    const totalProcessed = message.successCount + message.failureCount + message.skipCount;
    if (totalProcessed > message.totalChannels) {
      errors.push({
        field: 'counts',
        message: 'Combined success, failure, and skip counts cannot exceed total channels',
      });
    }
  }

  // Timestamp validations
  if (!(message.createdAt instanceof Timestamp)) {
    errors.push({
      field: 'createdAt',
      message: 'createdAt must be a Firebase Timestamp',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate MessageDelivery object
 */
export function validateMessageDelivery(delivery: any): ValidationResult {
  const errors: ValidationError[] = [];

  if (!delivery || typeof delivery !== 'object') {
    errors.push({
      field: 'delivery',
      message: 'Message delivery object is required',
    });
    return { isValid: false, errors };
  }

  // Required field validations
  if (!delivery.id || typeof delivery.id !== 'string' || delivery.id.trim() === '') {
    errors.push({
      field: 'id',
      message: 'Delivery ID is required',
    });
  }

  if (
    !delivery.messageId ||
    typeof delivery.messageId !== 'string' ||
    delivery.messageId.trim() === ''
  ) {
    errors.push({
      field: 'messageId',
      message: 'Message ID is required',
    });
  }

  if (
    !delivery.channelId ||
    typeof delivery.channelId !== 'string' ||
    !isValidSlackChannelId(delivery.channelId)
  ) {
    errors.push({
      field: 'channelId',
      message: 'Valid Slack channel ID is required',
    });
  }

  if (
    !delivery.channelName ||
    typeof delivery.channelName !== 'string' ||
    delivery.channelName.trim() === ''
  ) {
    errors.push({
      field: 'channelName',
      message: 'Channel name is required',
    });
  }

  // Status validation
  const validStatuses = Object.values(DeliveryStatus);
  if (!delivery.status || !validStatuses.includes(delivery.status)) {
    errors.push({
      field: 'status',
      message: 'Status must be one of: pending, success, failed, skipped',
    });
  }

  // Retry count validation
  if (
    typeof delivery.retryCount !== 'number' ||
    delivery.retryCount < 0 ||
    !Number.isInteger(delivery.retryCount)
  ) {
    errors.push({
      field: 'retryCount',
      message: 'Retry count must be a non-negative integer',
    });
  }

  // Status-specific validations
  if (delivery.status === DeliveryStatus.SUCCESS) {
    if (
      !delivery.slackMessageId ||
      typeof delivery.slackMessageId !== 'string' ||
      delivery.slackMessageId.trim() === ''
    ) {
      errors.push({
        field: 'slackMessageId',
        message: 'Slack message ID is required for successful deliveries',
      });
    }

    if (!(delivery.completedAt instanceof Timestamp)) {
      errors.push({
        field: 'completedAt',
        message: 'completedAt timestamp is required for successful deliveries',
      });
    }
  }

  if (delivery.status === DeliveryStatus.FAILED) {
    if (
      !delivery.errorMessage ||
      typeof delivery.errorMessage !== 'string' ||
      delivery.errorMessage.trim() === ''
    ) {
      errors.push({
        field: 'errorMessage',
        message: 'Error message is required for failed deliveries',
      });
    }

    if (!(delivery.completedAt instanceof Timestamp)) {
      errors.push({
        field: 'completedAt',
        message: 'completedAt timestamp is required for failed deliveries',
      });
    }
  }

  // Timestamp sequence validation
  if (delivery.sentAt instanceof Timestamp && delivery.completedAt instanceof Timestamp) {
    if (delivery.completedAt.toMillis() < delivery.sentAt.toMillis()) {
      errors.push({
        field: 'completedAt',
        message: 'completedAt must be after sentAt',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate channel list name uniqueness for a user
 */
export function validateChannelListNameUniqueness(
  name: string,
  existingNames: string[],
  excludeId?: string
): ValidationResult {
  const errors: ValidationError[] = [];

  if (existingNames.includes(name)) {
    errors.push({
      field: 'name',
      message: 'A channel list with this name already exists',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that channels exist and are accessible
 */
export function validateChannelAccessibility(
  channelIds: string[],
  accessibleChannels: { id: string; isDeleted: boolean; isArchived: boolean }[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const accessibleChannelIds = new Set(accessibleChannels.map(c => c.id));

  const inaccessibleChannels = channelIds.filter(id => !accessibleChannelIds.has(id));

  if (inaccessibleChannels.length > 0) {
    errors.push({
      field: 'channelIds',
      message: `Cannot access channels: ${inaccessibleChannels.join(', ')}`,
    });
  }

  // Check for deleted channels
  const deletedChannels = channelIds.filter(id => {
    const channel = accessibleChannels.find(c => c.id === id);
    return channel && channel.isDeleted;
  });

  if (deletedChannels.length > 0) {
    errors.push({
      field: 'channelIds',
      message: `Some channels have been deleted: ${deletedChannels.join(', ')}`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Batch validation utility
 */
export function validateBatch<T>(
  items: T[],
  validator: (item: T) => ValidationResult
): { valid: T[]; invalid: Array<{ item: T; errors: ValidationError[] }> } {
  const valid: T[] = [];
  const invalid: Array<{ item: T; errors: ValidationError[] }> = [];

  items.forEach(item => {
    const result = validator(item);
    if (result.isValid) {
      valid.push(item);
    } else {
      invalid.push({ item, errors: result.errors });
    }
  });

  return { valid, invalid };
}
