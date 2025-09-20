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
  lastSyncAt: Date;
}

/**
 * Validation error for Channel data
 */
export class ChannelValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ChannelValidationError';
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
 * Validates if a string is a valid Slack team ID format
 * Slack team IDs should match pattern: T followed by 10 alphanumeric characters
 */
function isValidTeamId(teamId: string): boolean {
  return typeof teamId === 'string' && /^T[A-Z0-9]{10}$/.test(teamId);
}

/**
 * Validates if a name meets requirements
 * Must be non-empty string
 */
function isValidName(name: string): boolean {
  return typeof name === 'string' && name.trim().length > 0;
}

/**
 * Validates if display name meets requirements
 * Must be non-empty string and should start with #
 */
function isValidDisplayName(displayName: string): boolean {
  return typeof displayName === 'string' && 
         displayName.trim().length > 0 && 
         displayName.charAt(0) === '#';
}

/**
 * Validates a Channel object according to the data model rules
 * @param channel - The channel object to validate
 * @throws ChannelValidationError if validation fails
 */
export function validateChannel(channel: Partial<Channel>): asserts channel is Channel {
  if (!channel.id || !isValidChannelId(channel.id)) {
    throw new ChannelValidationError('id must be a valid Slack channel ID format', 'id');
  }

  if (!channel.teamId || !isValidTeamId(channel.teamId)) {
    throw new ChannelValidationError('teamId must be a valid Slack team ID format', 'teamId');
  }

  if (!channel.name || !isValidName(channel.name)) {
    throw new ChannelValidationError('name is required and must be a non-empty string', 'name');
  }

  if (!channel.displayName || !isValidDisplayName(channel.displayName)) {
    throw new ChannelValidationError('displayName is required and must start with #', 'displayName');
  }

  if (typeof channel.isPrivate !== 'boolean') {
    throw new ChannelValidationError('isPrivate must be a boolean value', 'isPrivate');
  }

  if (typeof channel.isArchived !== 'boolean') {
    throw new ChannelValidationError('isArchived must be a boolean value', 'isArchived');
  }

  if (typeof channel.memberCount !== 'number' || channel.memberCount < 0) {
    throw new ChannelValidationError('memberCount must be a non-negative number', 'memberCount');
  }

  if (typeof channel.isDeleted !== 'boolean') {
    throw new ChannelValidationError('isDeleted must be a boolean value', 'isDeleted');
  }

  if (!channel.lastSyncAt || !(channel.lastSyncAt instanceof Date)) {
    throw new ChannelValidationError('lastSyncAt must be a valid Date', 'lastSyncAt');
  }

  // purpose is optional, but if provided should be a string
  if (channel.purpose !== undefined && (typeof channel.purpose !== 'string' || channel.purpose.trim().length === 0)) {
    throw new ChannelValidationError('purpose must be a non-empty string if provided', 'purpose');
  }

  // topic is optional, but if provided should be a string
  if (channel.topic !== undefined && (typeof channel.topic !== 'string' || channel.topic.trim().length === 0)) {
    throw new ChannelValidationError('topic must be a non-empty string if provided', 'topic');
  }
}

/**
 * Validates if a Channel can receive messages
 * Business rules: deleted channels are excluded from messaging
 * @param channel - The channel to validate
 * @returns true if channel can receive messages
 */
export function canReceiveMessages(channel: Channel): boolean {
  return !channel.isDeleted;
}

/**
 * Checks if a channel should show a warning
 * Business rules: archived channels should show warning but allow selection
 * @param channel - The channel to check
 * @returns true if channel should show warning
 */
export function shouldShowWarning(channel: Channel): boolean {
  return channel.isArchived && !channel.isDeleted;
}

/**
 * Creates a new Channel object with validation
 * @param channelData - Partial channel data to create a Channel from
 * @returns Validated Channel object
 * @throws ChannelValidationError if validation fails
 */
export function createChannel(channelData: Partial<Channel>): Channel {
  validateChannel(channelData);
  return channelData as Channel;
}

/**
 * Type guard to check if an object is a valid Channel
 * @param obj - Object to check
 * @returns true if obj is a valid Channel
 */
export function isChannel(obj: any): obj is Channel {
  try {
    validateChannel(obj);
    return true;
  } catch {
    return false;
  }
}