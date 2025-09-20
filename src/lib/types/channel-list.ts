import { Timestamp } from 'firebase/firestore';

/**
 * User-defined groups of channels for batch messaging
 * Storage: Firestore collection
 */
export interface ChannelList {
  /** Auto-generated document ID */
  id: string;
  /** User UID who owns this list */
  ownerId: string;
  /** User-defined list name */
  name: string;
  /** Optional description */
  description?: string;
  /** Array of Slack channel IDs */
  channelIds: string[];
  /** Computed field for quick access */
  channelCount: number;
  /** Whether list is active */
  isActive: boolean;
  /** Creation timestamp */
  createdAt: Timestamp;
  /** Last modification timestamp */
  updatedAt: Timestamp;
  /** Last time used for messaging */
  lastUsedAt?: Timestamp;
}

/**
 * Validation errors for ChannelList
 */
export interface ChannelListValidationError {
  field: string;
  message: string;
}

/**
 * Validation result for ChannelList
 */
export interface ChannelListValidationResult {
  isValid: boolean;
  errors: ChannelListValidationError[];
}

/**
 * Validates a ChannelList object
 */
export function validateChannelList(channelList: any): ChannelListValidationResult {
  const errors: ChannelListValidationError[] = [];

  // Required field validations
  if (!channelList.id || typeof channelList.id !== 'string' || channelList.id.trim() === '') {
    errors.push({
      field: 'id',
      message: 'Channel list ID is required and must be a non-empty string',
    });
  }

  if (
    !channelList.ownerId ||
    typeof channelList.ownerId !== 'string' ||
    channelList.ownerId.trim() === ''
  ) {
    errors.push({
      field: 'ownerId',
      message: 'Owner ID is required and must be a non-empty string',
    });
  }

  if (!channelList.name || typeof channelList.name !== 'string' || channelList.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Channel list name is required and must be a non-empty string',
    });
  }

  // Name length validation (max 100 characters)
  if (channelList.name && typeof channelList.name === 'string' && channelList.name.length > 100) {
    errors.push({
      field: 'name',
      message: 'Channel list name must not exceed 100 characters',
    });
  }

  // Channel IDs validation
  if (!Array.isArray(channelList.channelIds)) {
    errors.push({
      field: 'channelIds',
      message: 'Channel IDs must be an array',
    });
  } else {
    // Check max 100 items (business rule)
    if (channelList.channelIds.length > 100) {
      errors.push({
        field: 'channelIds',
        message: 'Channel list cannot contain more than 100 channels',
      });
    }

    // Validate each channel ID
    channelList.channelIds.forEach((channelId: any, index: number) => {
      if (typeof channelId !== 'string' || channelId.trim() === '') {
        errors.push({
          field: `channelIds[${index}]`,
          message: 'Each channel ID must be a non-empty string',
        });
      } else if (!channelId.match(/^C[A-Z0-9]+$/)) {
        errors.push({
          field: `channelIds[${index}]`,
          message:
            'Channel ID must follow Slack channel ID format (C followed by alphanumeric characters)',
        });
      }
    });

    // Check for duplicate channel IDs
    const uniqueChannelIds = new Set(channelList.channelIds);
    if (uniqueChannelIds.size !== channelList.channelIds.length) {
      errors.push({
        field: 'channelIds',
        message: 'Channel IDs must be unique within the list',
      });
    }
  }

  // Channel count validation
  if (
    typeof channelList.channelCount !== 'number' ||
    channelList.channelCount < 0 ||
    !Number.isInteger(channelList.channelCount)
  ) {
    errors.push({
      field: 'channelCount',
      message: 'Channel count must be a non-negative integer',
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

  if (!channelList.createdAt || !(channelList.createdAt instanceof Timestamp)) {
    errors.push({
      field: 'createdAt',
      message: 'createdAt must be a Firebase Timestamp',
    });
  }

  if (!channelList.updatedAt || !(channelList.updatedAt instanceof Timestamp)) {
    errors.push({
      field: 'updatedAt',
      message: 'updatedAt must be a Firebase Timestamp',
    });
  }

  // Optional field validations
  if (
    channelList.description !== undefined &&
    (typeof channelList.description !== 'string' || channelList.description.length > 500)
  ) {
    errors.push({
      field: 'description',
      message: 'Description must be a string with maximum 500 characters',
    });
  }

  if (channelList.lastUsedAt !== undefined && !(channelList.lastUsedAt instanceof Timestamp)) {
    errors.push({
      field: 'lastUsedAt',
      message: 'lastUsedAt must be a Firebase Timestamp',
    });
  }

  // Firebase UID format validation for ownerId
  if (
    channelList.ownerId &&
    typeof channelList.ownerId === 'string' &&
    channelList.ownerId.length < 28
  ) {
    errors.push({
      field: 'ownerId',
      message: 'Owner ID must be a valid Firebase Auth UID',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a ChannelList object with default values
 */
export function createChannelList(data: Partial<ChannelList>): ChannelList {
  const now = Timestamp.now();
  const channelIds = data.channelIds || [];

  return {
    id: data.id || '',
    ownerId: data.ownerId || '',
    name: data.name || '',
    description: data.description,
    channelIds,
    channelCount: channelIds.length,
    isActive: data.isActive ?? true,
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    lastUsedAt: data.lastUsedAt,
  };
}

/**
 * Type guard to check if an object is a valid ChannelList
 */
export function isChannelList(obj: any): obj is ChannelList {
  const result = validateChannelList(obj);
  return result.isValid;
}

/**
 * Updates the channelCount field to match the channelIds array length
 */
export function updateChannelCount(channelList: ChannelList): ChannelList {
  return {
    ...channelList,
    channelCount: channelList.channelIds.length,
    updatedAt: Timestamp.now(),
  };
}

/**
 * Adds channel IDs to a channel list
 */
export function addChannelsToList(channelList: ChannelList, newChannelIds: string[]): ChannelList {
  const existingIds = new Set(channelList.channelIds);
  const uniqueNewIds = newChannelIds.filter(id => !existingIds.has(id));
  const updatedChannelIds = [...channelList.channelIds, ...uniqueNewIds];

  // Check business rule: max 100 channels
  if (updatedChannelIds.length > 100) {
    throw new Error('Channel list cannot contain more than 100 channels');
  }

  return {
    ...channelList,
    channelIds: updatedChannelIds,
    channelCount: updatedChannelIds.length,
    updatedAt: Timestamp.now(),
  };
}

/**
 * Removes channel IDs from a channel list
 */
export function removeChannelsFromList(
  channelList: ChannelList,
  channelIdsToRemove: string[]
): ChannelList {
  const idsToRemove = new Set(channelIdsToRemove);
  const updatedChannelIds = channelList.channelIds.filter(id => !idsToRemove.has(id));

  return {
    ...channelList,
    channelIds: updatedChannelIds,
    channelCount: updatedChannelIds.length,
    updatedAt: Timestamp.now(),
  };
}

/**
 * Marks a channel list as used (updates lastUsedAt)
 */
export function markChannelListAsUsed(channelList: ChannelList): ChannelList {
  return {
    ...channelList,
    lastUsedAt: Timestamp.now(),
  };
}
