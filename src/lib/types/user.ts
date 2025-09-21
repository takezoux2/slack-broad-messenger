import { Timestamp } from 'firebase/firestore';

/**
 * User preferences for customizing the application experience
 */
export interface UserPreferences {
  /** Theme selection */
  theme: 'light' | 'dark' | 'system';
  /** Language preference */
  language: string;
  /** Timezone preference */
  timezone: string;
  /** Notification settings */
  notifications: {
    email: boolean;
    push: boolean;
    messageDelivery: boolean;
    errorAlerts: boolean;
  };
}

/**
 * User account settings and configuration
 */
export interface UserSettings {
  /** Default message sending settings */
  defaultMessageSettings: {
    sendImmediately: boolean;
    confirmBeforeSend: boolean;
    saveAsDraft: boolean;
  };
  /** Rate limiting preferences */
  rateLimiting: {
    messagesPerMinute: number;
    maxConcurrentChannels: number;
  };
  /** Data retention settings */
  dataRetention: {
    keepSentMessages: boolean;
    retentionPeriodDays: number;
  };
}

/**
 * Represents the application user who creates channel lists and sends messages
 * Storage: Firebase Authentication + Firestore user profile
 */
export interface User {
  /** Firebase Auth UID (primary key) */
  uid: string;
  /** User email from Google OAuth */
  email: string;
  /** Google user ID */
  googleUserId: string;
  /** Display name from Google */
  displayName: string;
  /** Profile picture URL */
  avatar?: string;
  /** User preferences */
  preferences: UserPreferences;
  /** User settings */
  settings: UserSettings;
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
 * Creates default user preferences
 */
function createDefaultPreferences(): UserPreferences {
  return {
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    notifications: {
      email: true,
      push: true,
      messageDelivery: true,
      errorAlerts: true,
    },
  };
}

/**
 * Creates default user settings
 */
function createDefaultSettings(): UserSettings {
  return {
    defaultMessageSettings: {
      sendImmediately: false,
      confirmBeforeSend: true,
      saveAsDraft: true,
    },
    rateLimiting: {
      messagesPerMinute: 10,
      maxConcurrentChannels: 50,
    },
    dataRetention: {
      keepSentMessages: true,
      retentionPeriodDays: 90,
    },
  };
}

/**
 * Validates a User object according to the data model rules
 */
export function validateUser(user: unknown): UserValidationResult {
  const errors: UserValidationError[] = [];

  // Check if user is null or undefined
  if (!user || typeof user !== 'object') {
    errors.push({
      field: 'user',
      message: 'User must be a valid object',
    });
    return {
      isValid: false,
      errors,
    };
  }

  // Type assert user as any after checking it's an object for property access
  const userData = user as Record<string, unknown>;

  // Required field validations
  if (!userData.uid || !isValidFirebaseUID(userData.uid as string)) {
    errors.push({
      field: 'uid',
      message: 'uid must be a valid Firebase Auth UID',
    });
  }

  if (!userData.email || !isValidEmail(userData.email as string)) {
    errors.push({
      field: 'email',
      message: 'email must be a valid email format',
    });
  }

  if (
    !userData.googleUserId ||
    typeof userData.googleUserId !== 'string' ||
    userData.googleUserId.trim().length === 0
  ) {
    errors.push({
      field: 'googleUserId',
      message: 'googleUserId is required and must be a non-empty string',
    });
  }

  if (!userData.displayName || !isValidDisplayName(userData.displayName as string)) {
    errors.push({
      field: 'displayName',
      message: 'displayName is required and must be 1-100 characters',
    });
  }

  if (!userData.createdAt || !(userData.createdAt instanceof Timestamp)) {
    errors.push({
      field: 'createdAt',
      message: 'createdAt must be a Firebase Timestamp',
    });
  }

  if (!userData.lastLoginAt || !(userData.lastLoginAt instanceof Timestamp)) {
    errors.push({
      field: 'lastLoginAt',
      message: 'lastLoginAt must be a Firebase Timestamp',
    });
  }

  if (typeof userData.isActive !== 'boolean') {
    errors.push({
      field: 'isActive',
      message: 'isActive must be a boolean value',
    });
  }

  // Validate preferences object
  if (!userData.preferences || typeof userData.preferences !== 'object') {
    errors.push({
      field: 'preferences',
      message: 'preferences must be a valid object',
    });
  }

  // Validate settings object
  if (!userData.settings || typeof userData.settings !== 'object') {
    errors.push({
      field: 'settings',
      message: 'settings must be a valid object',
    });
  }

  // Optional field validations
  if (
    userData.avatar !== undefined &&
    (typeof userData.avatar !== 'string' || userData.avatar.trim().length === 0)
  ) {
    errors.push({
      field: 'avatar',
      message: 'avatar must be a non-empty string if provided',
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
    googleUserId: userData.googleUserId || '',
    displayName: userData.displayName || '',
    avatar: userData.avatar,
    preferences: userData.preferences || createDefaultPreferences(),
    settings: userData.settings || createDefaultSettings(),
    createdAt: userData.createdAt || now,
    lastLoginAt: userData.lastLoginAt || now,
    isActive: userData.isActive ?? true,
  };
}

/**
 * Type guard to check if an object is a valid User
 */
export function isUser(obj: unknown): obj is User {
  const result = validateUser(obj);
  return result.isValid;
}
