/**
 * Represents selectable senders from the Slack workspace
 * Storage: Firestore collection, synced from Slack API
 */
export interface SlackUser {
  /** Slack user ID (primary key) */
  id: string;
  /** Slack workspace/team ID */
  teamId: string;
  /** Username (e.g., @john.doe) */
  name: string;
  /** Display name */
  displayName: string;
  /** Full real name */
  realName?: string;
  /** Profile image URL */
  avatar: string;
  /** Whether user is a bot */
  isBot: boolean;
  /** Whether user is active in workspace */
  isActive: boolean;
  /** Whether user can post to channels */
  hasPostingPermission: boolean;
  /** Last sync from Slack API */
  lastSyncAt: Date;
}

/**
 * Validation error for SlackUser data
 */
export class SlackUserValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'SlackUserValidationError';
  }
}

/**
 * Validates if a string is a valid Slack user ID format
 * Slack user IDs should match pattern: U followed by 10 alphanumeric characters
 */
function isValidSlackUserId(userId: string): boolean {
  return typeof userId === 'string' && /^U[A-Z0-9]{10}$/.test(userId);
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
 * Validates if an avatar URL is valid
 * Must be non-empty string
 */
function isValidAvatar(avatar: string): boolean {
  return typeof avatar === 'string' && avatar.trim().length > 0;
}

/**
 * Validates a SlackUser object according to the data model rules
 * @param slackUser - The slack user object to validate
 * @throws SlackUserValidationError if validation fails
 */
export function validateSlackUser(slackUser: Partial<SlackUser>): asserts slackUser is SlackUser {
  if (!slackUser.id || !isValidSlackUserId(slackUser.id)) {
    throw new SlackUserValidationError('id must be a valid Slack user ID format', 'id');
  }

  if (!slackUser.teamId || !isValidTeamId(slackUser.teamId)) {
    throw new SlackUserValidationError('teamId must be a valid Slack team ID format', 'teamId');
  }

  if (!slackUser.name || !isValidName(slackUser.name)) {
    throw new SlackUserValidationError('name is required and must be a non-empty string', 'name');
  }

  if (!slackUser.displayName || !isValidName(slackUser.displayName)) {
    throw new SlackUserValidationError('displayName is required and must be a non-empty string', 'displayName');
  }

  if (!slackUser.avatar || !isValidAvatar(slackUser.avatar)) {
    throw new SlackUserValidationError('avatar is required and must be a non-empty string', 'avatar');
  }

  if (typeof slackUser.isBot !== 'boolean') {
    throw new SlackUserValidationError('isBot must be a boolean value', 'isBot');
  }

  if (typeof slackUser.isActive !== 'boolean') {
    throw new SlackUserValidationError('isActive must be a boolean value', 'isActive');
  }

  if (typeof slackUser.hasPostingPermission !== 'boolean') {
    throw new SlackUserValidationError('hasPostingPermission must be a boolean value', 'hasPostingPermission');
  }

  if (!slackUser.lastSyncAt || !(slackUser.lastSyncAt instanceof Date)) {
    throw new SlackUserValidationError('lastSyncAt must be a valid Date', 'lastSyncAt');
  }

  // realName is optional, but if provided should be a string
  if (slackUser.realName !== undefined && (typeof slackUser.realName !== 'string' || slackUser.realName.trim().length === 0)) {
    throw new SlackUserValidationError('realName must be a non-empty string if provided', 'realName');
  }

  // Business rule validation
  if (slackUser.isBot && slackUser.hasPostingPermission) {
    throw new SlackUserValidationError('bots should not have posting permission for message sending', 'hasPostingPermission');
  }

  if (!slackUser.isActive && slackUser.hasPostingPermission) {
    throw new SlackUserValidationError('inactive users should not have posting permission', 'hasPostingPermission');
  }
}

/**
 * Validates if a SlackUser can be used as a message sender
 * Business rules: must be active, not a bot, and have posting permission
 * @param slackUser - The slack user to validate
 * @returns true if user can send messages
 */
export function canSendMessages(slackUser: SlackUser): boolean {
  return slackUser.isActive && !slackUser.isBot && slackUser.hasPostingPermission;
}

/**
 * Creates a new SlackUser object with validation
 * @param slackUserData - Partial slack user data to create a SlackUser from
 * @returns Validated SlackUser object
 * @throws SlackUserValidationError if validation fails
 */
export function createSlackUser(slackUserData: Partial<SlackUser>): SlackUser {
  validateSlackUser(slackUserData);
  return slackUserData as SlackUser;
}

/**
 * Type guard to check if an object is a valid SlackUser
 * @param obj - Object to check
 * @returns true if obj is a valid SlackUser
 */
export function isSlackUser(obj: any): obj is SlackUser {
  try {
    validateSlackUser(obj);
    return true;
  } catch {
    return false;
  }
}