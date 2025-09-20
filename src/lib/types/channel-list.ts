/**
 * Represents user-defined groups of channels for batch messaging
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
  createdAt: Date;
  /** Last modification timestamp */
  updatedAt: Date;
  /** Last time used for messaging */
  lastUsedAt?: Date;
}

/**
 * Validation error for ChannelList data
 */
export class ChannelListValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ChannelListValidationError';
  }
}

/**
 * Validates if a string is a valid Slack channel ID format
 * Slack channel IDs should match pattern: C followed by 10 alphanumeric characters
 */
function isValidChannelId(channelId: string): boolean {
  return typeof channelId === 'string' && /^C[A-Z0-9]{10}$/.test(channelId);
}

/**
 * Validates if a name meets requirements
 * Must be non-empty and maximum 100 characters
 */
function isValidName(name: string): boolean {
  return typeof name === 'string' && 
         name.trim().length > 0 && 
         name.trim().length <= 100;
}

/**
 * Validates if a Firebase Auth UID is valid
 * Firebase UIDs are typically 28 character alphanumeric strings
 */
function isValidOwnerId(ownerId: string): boolean {
  return typeof ownerId === 'string' && ownerId.length > 0 && ownerId.length <= 128;
}

/**
 * Validates channel IDs array according to business rules
 * @param channelIds - Array of channel IDs to validate
 * @returns Array of validation error messages
 */
export function validateChannelIds(channelIds: string[]): string[] {
  const errors: string[] = [];
  const MAX_CHANNELS = 100;

  if (channelIds.length > MAX_CHANNELS) {
    errors.push(`Maximum of ${MAX_CHANNELS} channels allowed`);
  }

  for (const channelId of channelIds) {
    if (!isValidChannelId(channelId)) {
      errors.push(`Invalid channel ID format: ${channelId}`);
    }
  }

  return errors;
}

/**
 * Validates a ChannelList object according to the data model rules
 * @param channelList - The channel list object to validate
 * @throws ChannelListValidationError if validation fails
 */
export function validateChannelList(channelList: Partial<ChannelList>): asserts channelList is ChannelList {
  if (!channelList.id || typeof channelList.id !== 'string' || channelList.id.trim().length === 0) {
    throw new ChannelListValidationError('id is required and must be a non-empty string', 'id');
  }

  if (!channelList.ownerId || !isValidOwnerId(channelList.ownerId)) {
    throw new ChannelListValidationError('ownerId must be a valid user ID', 'ownerId');
  }

  if (!channelList.name || !isValidName(channelList.name)) {
    throw new ChannelListValidationError('name is required and must be 1-100 characters', 'name');
  }

  if (!Array.isArray(channelList.channelIds)) {
    throw new ChannelListValidationError('channelIds must be an array', 'channelIds');
  }

  // Validate channel IDs format and count
  const channelIdErrors = validateChannelIds(channelList.channelIds);
  if (channelIdErrors.length > 0) {
    throw new ChannelListValidationError(channelIdErrors.join('; '), 'channelIds');
  }

  if (typeof channelList.channelCount !== 'number' || channelList.channelCount < 0) {
    throw new ChannelListValidationError('channelCount must be a non-negative number', 'channelCount');
  }

  // Verify channelCount matches channelIds length
  if (channelList.channelCount !== channelList.channelIds.length) {
    throw new ChannelListValidationError('channelCount must match the number of channelIds', 'channelCount');
  }

  if (typeof channelList.isActive !== 'boolean') {
    throw new ChannelListValidationError('isActive must be a boolean value', 'isActive');
  }

  if (!channelList.createdAt || !(channelList.createdAt instanceof Date)) {
    throw new ChannelListValidationError('createdAt must be a valid Date', 'createdAt');
  }

  if (!channelList.updatedAt || !(channelList.updatedAt instanceof Date)) {
    throw new ChannelListValidationError('updatedAt must be a valid Date', 'updatedAt');
  }

  // description is optional, but if provided should be a string
  if (channelList.description !== undefined && (typeof channelList.description !== 'string' || channelList.description.trim().length === 0)) {
    throw new ChannelListValidationError('description must be a non-empty string if provided', 'description');
  }

  // lastUsedAt is optional, but if provided should be a Date
  if (channelList.lastUsedAt !== undefined && !(channelList.lastUsedAt instanceof Date)) {
    throw new ChannelListValidationError('lastUsedAt must be a valid Date if provided', 'lastUsedAt');
  }
}

/**
 * Creates a new ChannelList object with validation
 * @param channelListData - Partial channel list data to create a ChannelList from
 * @returns Validated ChannelList object
 * @throws ChannelListValidationError if validation fails
 */
export function createChannelList(channelListData: Partial<ChannelList>): ChannelList {
  validateChannelList(channelListData);
  return channelListData as ChannelList;
}

/**
 * Type guard to check if an object is a valid ChannelList
 * @param obj - Object to check
 * @returns true if obj is a valid ChannelList
 */
export function isChannelList(obj: any): obj is ChannelList {
  try {
    validateChannelList(obj);
    return true;
  } catch {
    return false;
  }
}