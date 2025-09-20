import { Timestamp } from 'firebase/firestore';

/**
 * Represents a Slack channel that can receive messages
 * Storage: Firestore collection, synced from Slack API
 */
export interface Channel {
  /** Slack channel ID (primary key) */
  id: string;
  /** Slack workspace/team ID */
  teamId: string;
  /** Channel name without # */
  name: string;
  /** Full channel name with # */
  displayName: string;
  /** Channel purpose/description */
  purpose?: string;
  /** Channel topic */
  topic?: string;
  /** Whether channel is private */
  isPrivate: boolean;
  /** Whether channel is archived */
  isArchived: boolean;
  /** Number of channel members */
  memberCount: number;
  /** Marked as deleted (auto-updated) */
  isDeleted: boolean;
  /** Last sync from Slack API */
  lastSyncAt: Timestamp;
}

/**
 * Validation errors for Channel
 */
export interface ChannelValidationError {
  field: string;
  message: string;
}

/**
 * Validation result for Channel
 */
export interface ChannelValidationResult {
  isValid: boolean;
  errors: ChannelValidationError[];
}

/**
 * Validates a Channel object
 */
export function validateChannel(channel: any): ChannelValidationResult {
  const errors: ChannelValidationError[] = [];

  // Required field validations
  if (!channel.id || typeof channel.id !== 'string' || channel.id.trim() === '') {
    errors.push({
      field: 'id',
      message: 'Channel ID is required and must be a non-empty string',
    });
  }

  if (!channel.teamId || typeof channel.teamId !== 'string' || channel.teamId.trim() === '') {
    errors.push({
      field: 'teamId',
      message: 'Team ID is required and must be a non-empty string',
    });
  }

  if (!channel.name || typeof channel.name !== 'string' || channel.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Channel name is required and must be a non-empty string',
    });
  }

  if (
    !channel.displayName ||
    typeof channel.displayName !== 'string' ||
    channel.displayName.trim() === ''
  ) {
    errors.push({
      field: 'displayName',
      message: 'Display name is required and must be a non-empty string',
    });
  }

  if (typeof channel.isPrivate !== 'boolean') {
    errors.push({
      field: 'isPrivate',
      message: 'isPrivate must be a boolean',
    });
  }

  if (typeof channel.isArchived !== 'boolean') {
    errors.push({
      field: 'isArchived',
      message: 'isArchived must be a boolean',
    });
  }

  if (
    typeof channel.memberCount !== 'number' ||
    channel.memberCount < 0 ||
    !Number.isInteger(channel.memberCount)
  ) {
    errors.push({
      field: 'memberCount',
      message: 'Member count must be a non-negative integer',
    });
  }

  if (typeof channel.isDeleted !== 'boolean') {
    errors.push({
      field: 'isDeleted',
      message: 'isDeleted must be a boolean',
    });
  }

  if (!channel.lastSyncAt || !(channel.lastSyncAt instanceof Timestamp)) {
    errors.push({
      field: 'lastSyncAt',
      message: 'lastSyncAt must be a Firebase Timestamp',
    });
  }

  // Optional field validations
  if (
    channel.purpose !== undefined &&
    (typeof channel.purpose !== 'string' || channel.purpose.length > 250)
  ) {
    errors.push({
      field: 'purpose',
      message: 'Purpose must be a string with maximum 250 characters',
    });
  }

  if (
    channel.topic !== undefined &&
    (typeof channel.topic !== 'string' || channel.topic.length > 250)
  ) {
    errors.push({
      field: 'topic',
      message: 'Topic must be a string with maximum 250 characters',
    });
  }

  // Slack ID format validation (basic pattern check)
  if (channel.id && typeof channel.id === 'string' && !channel.id.match(/^C[A-Z0-9]+$/)) {
    errors.push({
      field: 'id',
      message:
        'Channel ID must follow Slack channel ID format (C followed by alphanumeric characters)',
    });
  }

  if (
    channel.teamId &&
    typeof channel.teamId === 'string' &&
    !channel.teamId.match(/^T[A-Z0-9]+$/)
  ) {
    errors.push({
      field: 'teamId',
      message: 'Team ID must follow Slack team ID format (T followed by alphanumeric characters)',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a Channel object with default values
 */
export function createChannel(data: Partial<Channel>): Channel {
  const now = Timestamp.now();

  return {
    id: data.id || '',
    teamId: data.teamId || '',
    name: data.name || '',
    displayName: data.displayName || (data.name ? `#${data.name}` : ''),
    purpose: data.purpose,
    topic: data.topic,
    isPrivate: data.isPrivate ?? false,
    isArchived: data.isArchived ?? false,
    memberCount: data.memberCount ?? 0,
    isDeleted: data.isDeleted ?? false,
    lastSyncAt: data.lastSyncAt || now,
  };
}

/**
 * Type guard to check if an object is a valid Channel
 */
export function isChannel(obj: any): obj is Channel {
  const result = validateChannel(obj);
  return result.isValid;
}

/**
 * Checks if a channel is available for messaging
 * (not deleted and not archived, or archived with warning)
 */
export function isChannelAvailableForMessaging(channel: Channel): boolean {
  return !channel.isDeleted;
}

/**
 * Checks if a channel should show a warning before messaging
 * (archived channels)
 */
export function shouldShowChannelWarning(channel: Channel): boolean {
  return channel.isArchived;
}
