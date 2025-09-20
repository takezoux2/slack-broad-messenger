import { Timestamp } from 'firebase/firestore';

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
  /** Slack access token for API calls */
  slackAccessToken?: string;
  /** Slack OAuth scope */
  slackScope?: string;
  /** Account creation time */
  createdAt: Timestamp;
  /** Last login timestamp */
  lastLoginAt: Timestamp;
  /** Account status */
  isActive: boolean;
}

/**
 * Validation errors for User
 */
export interface UserValidationError {
  field: string;
  message: string;
}

/**
 * Validation result for User
 */
export interface UserValidationResult {
  isValid: boolean;
  errors: UserValidationError[];
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
  return (
    typeof displayName === 'string' &&
    displayName.trim().length > 0 &&
    displayName.trim().length <= 100
  );
}

/**
 * Validates a User object according to the data model rules
 */
export function validateUser(user: any): UserValidationResult {
  const errors: UserValidationError[] = [];

  // Required field validations
  if (!user.uid || !isValidFirebaseUID(user.uid)) {
    errors.push({
      field: 'uid',
      message: 'uid must be a valid Firebase Auth UID',
    });
  }

  if (!user.email || !isValidEmail(user.email)) {
    errors.push({
      field: 'email',
      message: 'email must be a valid email format',
    });
  }

  if (
    !user.slackUserId ||
    typeof user.slackUserId !== 'string' ||
    user.slackUserId.trim().length === 0
  ) {
    errors.push({
      field: 'slackUserId',
      message: 'slackUserId is required and must be a non-empty string',
    });
  }

  if (!user.displayName || !isValidDisplayName(user.displayName)) {
    errors.push({
      field: 'displayName',
      message: 'displayName is required and must be 1-100 characters',
    });
  }

  if (
    !user.slackTeamId ||
    typeof user.slackTeamId !== 'string' ||
    user.slackTeamId.trim().length === 0
  ) {
    errors.push({
      field: 'slackTeamId',
      message: 'slackTeamId is required and must be a non-empty string',
    });
  }

  if (!user.createdAt || !(user.createdAt instanceof Timestamp)) {
    errors.push({
      field: 'createdAt',
      message: 'createdAt must be a Firebase Timestamp',
    });
  }

  if (!user.lastLoginAt || !(user.lastLoginAt instanceof Timestamp)) {
    errors.push({
      field: 'lastLoginAt',
      message: 'lastLoginAt must be a Firebase Timestamp',
    });
  }

  if (typeof user.isActive !== 'boolean') {
    errors.push({
      field: 'isActive',
      message: 'isActive must be a boolean value',
    });
  }

  // Optional field validations
  if (
    user.avatar !== undefined &&
    (typeof user.avatar !== 'string' || user.avatar.trim().length === 0)
  ) {
    errors.push({
      field: 'avatar',
      message: 'avatar must be a non-empty string if provided',
    });
  }

  if (
    user.slackAccessToken !== undefined &&
    (typeof user.slackAccessToken !== 'string' || user.slackAccessToken.trim().length === 0)
  ) {
    errors.push({
      field: 'slackAccessToken',
      message: 'slackAccessToken must be a non-empty string if provided',
    });
  }

  if (
    user.slackScope !== undefined &&
    (typeof user.slackScope !== 'string' || user.slackScope.trim().length === 0)
  ) {
    errors.push({
      field: 'slackScope',
      message: 'slackScope must be a non-empty string if provided',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a new User object with default values
 */
export function createUser(userData: Partial<User>): User {
  const now = Timestamp.now();

  return {
    uid: userData.uid || '',
    email: userData.email || '',
    slackUserId: userData.slackUserId || '',
    displayName: userData.displayName || '',
    avatar: userData.avatar,
    slackTeamId: userData.slackTeamId || '',
    slackAccessToken: userData.slackAccessToken,
    slackScope: userData.slackScope,
    createdAt: userData.createdAt || now,
    lastLoginAt: userData.lastLoginAt || now,
    isActive: userData.isActive ?? true,
  };
}

/**
 * Type guard to check if an object is a valid User
 */
export function isUser(obj: any): obj is User {
  const result = validateUser(obj);
  return result.isValid;
}
