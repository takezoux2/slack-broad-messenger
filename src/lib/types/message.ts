/**
 * Represents a message sent to multiple channels
 * Storage: Firestore collection
 */

/**
 * Overall message status enumeration
 */
export enum MessageStatus {
  DRAFT = 'draft',
  SENDING = 'sending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Message interface definition
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
  createdAt: Date;
  /** When sending started */
  sentAt?: Date;
  /** When sending completed */
  completedAt?: Date;
}

/**
 * Validation error for Message data
 */
export class MessageValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'MessageValidationError';
  }
}

/**
 * Validates if a string is valid message content
 * Must be non-empty and maximum 4000 characters (Slack limit)
 */
function isValidContent(content: string): boolean {
  return typeof content === 'string' && 
         content.trim().length > 0 && 
         content.length <= 4000;
}

/**
 * Validates if a string is a valid ID reference
 * Must be non-empty string
 */
function isValidId(id: string): boolean {
  return typeof id === 'string' && id.trim().length > 0;
}

/**
 * Validates if a number is a valid count (non-negative integer)
 */
function isValidCount(count: number): boolean {
  return typeof count === 'number' && 
         Number.isInteger(count) && 
         count >= 0;
}

/**
 * Validates if a value is a valid MessageStatus
 */
function isValidMessageStatus(status: any): status is MessageStatus {
  return Object.values(MessageStatus).includes(status);
}

/**
 * Validates a Message object according to the data model rules
 * @param message - The message object to validate
 * @throws MessageValidationError if validation fails
 */
export function validateMessage(message: Partial<Message>): asserts message is Message {
  if (!message.id || !isValidId(message.id)) {
    throw new MessageValidationError('id is required and must be a non-empty string', 'id');
  }

  if (!message.senderId || !isValidId(message.senderId)) {
    throw new MessageValidationError('senderId is required and must be a non-empty string', 'senderId');
  }

  if (!message.selectedSenderId || !isValidId(message.selectedSenderId)) {
    throw new MessageValidationError('selectedSenderId is required and must be a non-empty string', 'selectedSenderId');
  }

  if (!message.channelListId || !isValidId(message.channelListId)) {
    throw new MessageValidationError('channelListId is required and must be a non-empty string', 'channelListId');
  }

  if (!message.content || !isValidContent(message.content)) {
    throw new MessageValidationError('content is required and must be 1-4000 characters', 'content');
  }

  if (!message.status || !isValidMessageStatus(message.status)) {
    throw new MessageValidationError('status is required and must be a valid MessageStatus', 'status');
  }

  if (typeof message.totalChannels !== 'number' || !isValidCount(message.totalChannels)) {
    throw new MessageValidationError('totalChannels must be a non-negative integer', 'totalChannels');
  }

  if (typeof message.successCount !== 'number' || !isValidCount(message.successCount)) {
    throw new MessageValidationError('successCount must be a non-negative integer', 'successCount');
  }

  if (typeof message.failureCount !== 'number' || !isValidCount(message.failureCount)) {
    throw new MessageValidationError('failureCount must be a non-negative integer', 'failureCount');
  }

  if (typeof message.skipCount !== 'number' || !isValidCount(message.skipCount)) {
    throw new MessageValidationError('skipCount must be a non-negative integer', 'skipCount');
  }

  if (!message.createdAt || !(message.createdAt instanceof Date)) {
    throw new MessageValidationError('createdAt must be a valid Date', 'createdAt');
  }

  // Optional fields validation
  if (message.sentAt !== undefined && !(message.sentAt instanceof Date)) {
    throw new MessageValidationError('sentAt must be a valid Date if provided', 'sentAt');
  }

  if (message.completedAt !== undefined && !(message.completedAt instanceof Date)) {
    throw new MessageValidationError('completedAt must be a valid Date if provided', 'completedAt');
  }

  // Business rule validation: counts should not exceed totalChannels
  const totalDeliveryCount = message.successCount + message.failureCount + message.skipCount;
  if (totalDeliveryCount > message.totalChannels) {
    throw new MessageValidationError('Sum of success, failure, and skip counts cannot exceed totalChannels', 'counts');
  }
}

/**
 * Creates a new Message object with validation
 * @param messageData - Partial message data to create a Message from
 * @returns Validated Message object
 * @throws MessageValidationError if validation fails
 */
export function createMessage(messageData: Partial<Message>): Message {
  validateMessage(messageData);
  return messageData as Message;
}

/**
 * Type guard to check if an object is a valid Message
 * @param obj - Object to check
 * @returns true if obj is a valid Message
 */
export function isMessage(obj: any): obj is Message {
  try {
    validateMessage(obj);
    return true;
  } catch {
    return false;
  }
}