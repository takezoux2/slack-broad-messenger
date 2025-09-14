/**
 * Represents the application user who creates channel lists and sends messages
 * Storage: Firebase Authentication + Firestore user profile
 */
export interface User {
  /** Firebase Auth UID (primary key) */
  uid: string;
  /** User email from Slack OAuth */
  email: string;
  /** Slack user ID */
  slackUserId: string;
  /** Display name from Slack */
  displayName: string;
  /** Profile picture URL */
  avatar?: string;
  /** Slack workspace/team ID */
  slackTeamId: string;
  /** Account creation time */
  createdAt: Date;
  /** Last login timestamp */
  lastLoginAt: Date;
  /** Account status */
  isActive: boolean;
}

/**
 * Validation error for User data
 */
export class UserValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'UserValidationError';
  }
}

/**
 * Validates if a string is a valid Firebase Auth UID
 * Firebase UIDs are typically 28 character alphanumeric strings
 */
function isValidFirebaseUID(uid: string): boolean {
  return typeof uid === 'string' && uid.length > 0 && uid.length <= 128;
}

/**
 * Validates if a string is a valid email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates if a display name meets requirements
 * Must be non-empty and maximum 100 characters
 */
function isValidDisplayName(displayName: string): boolean {
  return typeof displayName === 'string' && 
         displayName.trim().length > 0 && 
         displayName.trim().length <= 100;
}

/**
 * Validates a User object according to the data model rules
 * @param user - The user object to validate
 * @throws UserValidationError if validation fails
 */
export function validateUser(user: Partial<User>): asserts user is User {
  if (!user.uid || !isValidFirebaseUID(user.uid)) {
    throw new UserValidationError('uid must be a valid Firebase Auth UID', 'uid');
  }

  if (!user.email || !isValidEmail(user.email)) {
    throw new UserValidationError('email must be a valid email format', 'email');
  }

  if (!user.slackUserId || typeof user.slackUserId !== 'string' || user.slackUserId.trim().length === 0) {
    throw new UserValidationError('slackUserId is required and must be a non-empty string', 'slackUserId');
  }

  if (!user.displayName || !isValidDisplayName(user.displayName)) {
    throw new UserValidationError('displayName is required and must be 1-100 characters', 'displayName');
  }

  if (!user.slackTeamId || typeof user.slackTeamId !== 'string' || user.slackTeamId.trim().length === 0) {
    throw new UserValidationError('slackTeamId is required and must be a non-empty string', 'slackTeamId');
  }

  if (!user.createdAt || !(user.createdAt instanceof Date)) {
    throw new UserValidationError('createdAt must be a valid Date', 'createdAt');
  }

  if (!user.lastLoginAt || !(user.lastLoginAt instanceof Date)) {
    throw new UserValidationError('lastLoginAt must be a valid Date', 'lastLoginAt');
  }

  if (typeof user.isActive !== 'boolean') {
    throw new UserValidationError('isActive must be a boolean value', 'isActive');
  }

  // Avatar is optional, but if provided should be a string
  if (user.avatar !== undefined && (typeof user.avatar !== 'string' || user.avatar.trim().length === 0)) {
    throw new UserValidationError('avatar must be a non-empty string if provided', 'avatar');
  }
}

/**
 * Creates a new User object with validation
 * @param userData - Partial user data to create a User from
 * @returns Validated User object
 * @throws UserValidationError if validation fails
 */
export function createUser(userData: Partial<User>): User {
  validateUser(userData);
  return userData as User;
}

/**
 * Type guard to check if an object is a valid User
 * @param obj - Object to check
 * @returns true if obj is a valid User
 */
export function isUser(obj: any): obj is User {
  try {
    validateUser(obj);
    return true;
  } catch {
    return false;
  }
}