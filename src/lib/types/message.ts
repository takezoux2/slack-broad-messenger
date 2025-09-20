import { Timestamp } from 'firebase/firestore';

/**
 * Message status enumeration
 */
export enum MessageStatus {
  DRAFT = 'draft',
  SENDING = 'sending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Represents a message sent to multiple channels
 * Storage: Firestore collection
 */
export interface Message {
  /** Auto-generated document ID */
  id: string;
  /** User UID who sent the message */
  senderId: string;
  /** Slack user ID of chosen sender */
  selectedSenderId: string;
  /** Reference to ChannelList used */
  channelListId: string;
  /** Message text content */
  content: string;
  /** Overall message status */
  status: MessageStatus;
  /** Total channels targeted */
  totalChannels: number;
  /** Successfully delivered count */
  successCount: number;
  /** Failed delivery count */
  failureCount: number;
  /** Skipped (deleted) channels count */
  skipCount: number;
  /** Message creation time */
  createdAt: Timestamp;
  /** When sending started */
  sentAt?: Timestamp;
  /** When sending completed */
  completedAt?: Timestamp;
}

/**
 * Validation errors for Message
 */
export interface MessageValidationError {
  field: string;
  message: string;
}

/**
 * Validation result for Message
 */
export interface MessageValidationResult {
  isValid: boolean;
  errors: MessageValidationError[];
}

/**
 * Validates a Message object
 */
export function validateMessage(message: any): MessageValidationResult {
  const errors: MessageValidationError[] = [];

  // Required field validations
  if (!message.id || typeof message.id !== 'string' || message.id.trim() === '') {
    errors.push({
      field: 'id',
      message: 'Message ID is required and must be a non-empty string'
    });
  }

  if (!message.senderId || typeof message.senderId !== 'string' || message.senderId.trim() === '') {
    errors.push({
      field: 'senderId',
      message: 'Sender ID is required and must be a non-empty string'
    });
  }

  if (!message.selectedSenderId || typeof message.selectedSenderId !== 'string' || message.selectedSenderId.trim() === '') {
    errors.push({
      field: 'selectedSenderId',
      message: 'Selected sender ID is required and must be a non-empty string'
    });
  }

  if (!message.channelListId || typeof message.channelListId !== 'string' || message.channelListId.trim() === '') {
    errors.push({
      field: 'channelListId',
      message: 'Channel list ID is required and must be a non-empty string'
    });
  }

  if (!message.content || typeof message.content !== 'string' || message.content.trim() === '') {
    errors.push({
      field: 'content',
      message: 'Message content is required and must be a non-empty string'
    });
  }

  // Content length validation (Slack limit: 4000 characters)
  if (message.content && typeof message.content === 'string' && message.content.length > 4000) {
    errors.push({
      field: 'content',
      message: 'Message content must not exceed 4000 characters (Slack limit)'
    });
  }

  // Status validation
  if (!message.status || !Object.values(MessageStatus).includes(message.status)) {
    errors.push({
      field: 'status',
      message: 'Status must be one of: draft, sending, completed, failed'
    });
  }

  // Numeric field validations
  if (typeof message.totalChannels !== 'number' || message.totalChannels < 0 || !Number.isInteger(message.totalChannels)) {
    errors.push({
      field: 'totalChannels',
      message: 'Total channels must be a non-negative integer'
    });
  }

  if (typeof message.successCount !== 'number' || message.successCount < 0 || !Number.isInteger(message.successCount)) {
    errors.push({
      field: 'successCount',
      message: 'Success count must be a non-negative integer'
    });
  }

  if (typeof message.failureCount !== 'number' || message.failureCount < 0 || !Number.isInteger(message.failureCount)) {
    errors.push({
      field: 'failureCount',
      message: 'Failure count must be a non-negative integer'
    });
  }

  if (typeof message.skipCount !== 'number' || message.skipCount < 0 || !Number.isInteger(message.skipCount)) {
    errors.push({
      field: 'skipCount',
      message: 'Skip count must be a non-negative integer'
    });
  }

  // Count consistency validation
  if (typeof message.totalChannels === 'number' && 
      typeof message.successCount === 'number' && 
      typeof message.failureCount === 'number' && 
      typeof message.skipCount === 'number') {
    const calculatedTotal = message.successCount + message.failureCount + message.skipCount;
    if (message.status === MessageStatus.COMPLETED && calculatedTotal !== message.totalChannels) {
      errors.push({
        field: 'counts',
        message: 'Sum of success, failure, and skip counts must equal total channels for completed messages'
      });
    }
  }

  // Timestamp validations
  if (!message.createdAt || !(message.createdAt instanceof Timestamp)) {
    errors.push({
      field: 'createdAt',
      message: 'createdAt must be a Firebase Timestamp'
    });
  }

  if (message.sentAt !== undefined && !(message.sentAt instanceof Timestamp)) {
    errors.push({
      field: 'sentAt',
      message: 'sentAt must be a Firebase Timestamp'
    });
  }

  if (message.completedAt !== undefined && !(message.completedAt instanceof Timestamp)) {
    errors.push({
      field: 'completedAt',
      message: 'completedAt must be a Firebase Timestamp'
    });
  }

  // Timestamp sequence validation
  if (message.sentAt && message.createdAt && message.sentAt.toMillis() < message.createdAt.toMillis()) {
    errors.push({
      field: 'sentAt',
      message: 'sentAt must be after createdAt'
    });
  }

  if (message.completedAt && message.sentAt && message.completedAt.toMillis() < message.sentAt.toMillis()) {
    errors.push({
      field: 'completedAt',
      message: 'completedAt must be after sentAt'
    });
  }

  // Firebase UID format validation for senderId
  if (message.senderId && typeof message.senderId === 'string' && message.senderId.length < 28) {
    errors.push({
      field: 'senderId',
      message: 'Sender ID must be a valid Firebase Auth UID'
    });
  }

  // Slack user ID format validation
  if (message.selectedSenderId && typeof message.selectedSenderId === 'string' && !message.selectedSenderId.match(/^U[A-Z0-9]+$/)) {
    errors.push({
      field: 'selectedSenderId',
      message: 'Selected sender ID must follow Slack user ID format (U followed by alphanumeric characters)'
    });
  }

  // Status-specific validations
  if (message.status === MessageStatus.SENDING && !message.sentAt) {
    errors.push({
      field: 'sentAt',
      message: 'sentAt is required when status is sending'
    });
  }

  if ((message.status === MessageStatus.COMPLETED || message.status === MessageStatus.FAILED) && !message.completedAt) {
    errors.push({
      field: 'completedAt',
      message: 'completedAt is required when status is completed or failed'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Creates a Message object with default values
 */
export function createMessage(data: Partial<Message>): Message {
  const now = Timestamp.now();
  
  return {
    id: data.id || '',
    senderId: data.senderId || '',
    selectedSenderId: data.selectedSenderId || '',
    channelListId: data.channelListId || '',
    content: data.content || '',
    status: data.status || MessageStatus.DRAFT,
    totalChannels: data.totalChannels ?? 0,
    successCount: data.successCount ?? 0,
    failureCount: data.failureCount ?? 0,
    skipCount: data.skipCount ?? 0,
    createdAt: data.createdAt || now,
    sentAt: data.sentAt,
    completedAt: data.completedAt
  };
}

/**
 * Type guard to check if an object is a valid Message
 */
export function isMessage(obj: any): obj is Message {
  const result = validateMessage(obj);
  return result.isValid;
}

/**
 * Updates message status to SENDING and sets sentAt timestamp
 */
export function startMessageSending(message: Message): Message {
  return {
    ...message,
    status: MessageStatus.SENDING,
    sentAt: Timestamp.now()
  };
}

/**
 * Updates message status to COMPLETED and sets completedAt timestamp
 */
export function completeMessage(message: Message, successCount: number, failureCount: number, skipCount: number): Message {
  return {
    ...message,
    status: MessageStatus.COMPLETED,
    successCount,
    failureCount,
    skipCount,
    completedAt: Timestamp.now()
  };
}

/**
 * Updates message status to FAILED and sets completedAt timestamp
 */
export function failMessage(message: Message, reason?: string): Message {
  return {
    ...message,
    status: MessageStatus.FAILED,
    completedAt: Timestamp.now()
  };
}

/**
 * Calculates the progress percentage of message delivery
 */
export function calculateMessageProgress(message: Message): number {
  if (message.totalChannels === 0) return 0;
  
  const processedChannels = message.successCount + message.failureCount + message.skipCount;
  return Math.round((processedChannels / message.totalChannels) * 100);
}

/**
 * Checks if a message is in a final state (completed or failed)
 */
export function isMessageFinished(message: Message): boolean {
  return message.status === MessageStatus.COMPLETED || message.status === MessageStatus.FAILED;
}

/**
 * Checks if a message is currently being sent
 */
export function isMessageSending(message: Message): boolean {
  return message.status === MessageStatus.SENDING;
}

/**
 * Checks if a message is still a draft
 */
export function isMessageDraft(message: Message): boolean {
  return message.status === MessageStatus.DRAFT;
}
