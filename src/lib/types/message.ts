/**
 * Overall message status enum
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
 * Validates if a string is a valid Firebase document ID
 * Must be non-empty string
 */
function isValidDocumentId(id: string): boolean {
  return typeof id === 'string' && id.trim().length > 0;
}

/**
 * Validates if a Firebase Auth UID is valid
 * Firebase UIDs are typically 28 character alphanumeric strings
 */
function isValidUserId(userId: string): boolean {
  return typeof userId === 'string' && userId.length > 0 && userId.length <= 128;
}

/**
 * Validates if a string is a valid Slack user ID format
 * Slack user IDs should match pattern: U followed by 10 alphanumeric characters
 */
function isValidSlackUserId(userId: string): boolean {
  return typeof userId === 'string' && /^U[A-Z0-9]{10}$/.test(userId);
}

/**
 * Validates if content meets requirements
 * Must be non-empty and max 4000 characters (Slack limit)
 */
function isValidContent(content: string): boolean {
  return typeof content === 'string' && 
         content.trim().length > 0 && 
         content.length <= 4000;
}

/**
 * Validates if a message status is valid
 */
function isValidMessageStatus(status: MessageStatus): boolean {
  return status === MessageStatus.DRAFT || 
         status === MessageStatus.SENDING || 
         status === MessageStatus.COMPLETED || 
         status === MessageStatus.FAILED;
}

/**
 * Validates a Message object according to the data model rules
 * @param message - The message object to validate
 * @throws MessageValidationError if validation fails
 */
export function validateMessage(message: Partial<Message>): asserts message is Message {
  if (!message.id || !isValidDocumentId(message.id)) {
    throw new MessageValidationError('id is required and must be a non-empty string', 'id');
  }

  if (!message.senderId || !isValidUserId(message.senderId)) {
    throw new MessageValidationError('senderId must be a valid user ID', 'senderId');
  }

  if (!message.selectedSenderId || !isValidSlackUserId(message.selectedSenderId)) {
    throw new MessageValidationError('selectedSenderId must be a valid Slack user ID', 'selectedSenderId');
  }

  if (!message.channelListId || !isValidDocumentId(message.channelListId)) {
    throw new MessageValidationError('channelListId is required and must be a valid document ID', 'channelListId');
  }

  if (!message.content || !isValidContent(message.content)) {
    throw new MessageValidationError('content is required, must be non-empty, and max 4000 characters', 'content');
  }

  if (!message.status || !isValidMessageStatus(message.status)) {
    throw new MessageValidationError('status must be a valid MessageStatus', 'status');
  }

  if (typeof message.totalChannels !== 'number' || message.totalChannels < 0) {
    throw new MessageValidationError('totalChannels must be a non-negative number', 'totalChannels');
  }

  if (typeof message.successCount !== 'number' || message.successCount < 0) {
    throw new MessageValidationError('successCount must be a non-negative number', 'successCount');
  }

  if (typeof message.failureCount !== 'number' || message.failureCount < 0) {
    throw new MessageValidationError('failureCount must be a non-negative number', 'failureCount');
  }

  if (typeof message.skipCount !== 'number' || message.skipCount < 0) {
    throw new MessageValidationError('skipCount must be a non-negative number', 'skipCount');
  }

  if (!message.createdAt || !(message.createdAt instanceof Date)) {
    throw new MessageValidationError('createdAt must be a valid Date', 'createdAt');
  }

  // sentAt is optional, but if provided should be a Date
  if (message.sentAt !== undefined && !(message.sentAt instanceof Date)) {
    throw new MessageValidationError('sentAt must be a valid Date if provided', 'sentAt');
  }

  // completedAt is optional, but if provided should be a Date
  if (message.completedAt !== undefined && !(message.completedAt instanceof Date)) {
    throw new MessageValidationError('completedAt must be a valid Date if provided', 'completedAt');
  }

  // Business logic validation
  const totalDeliveries = message.successCount + message.failureCount + message.skipCount;
  if (totalDeliveries > message.totalChannels) {
    throw new MessageValidationError('sum of delivery counts cannot exceed totalChannels', 'totalChannels');
  }

  // Status-based validation
  if (message.status === MessageStatus.DRAFT && (message.sentAt || message.completedAt)) {
    throw new MessageValidationError('draft messages should not have sentAt or completedAt', 'status');
  }

  if (message.status === MessageStatus.SENDING && !message.sentAt) {
    throw new MessageValidationError('sending messages must have sentAt', 'sentAt');
  }

  if ((message.status === MessageStatus.COMPLETED || message.status === MessageStatus.FAILED) && !message.completedAt) {
    throw new MessageValidationError('completed/failed messages must have completedAt', 'completedAt');
  }
}

/**
 * Calculates the completion percentage of a message
 * @param message - The message to calculate completion for
 * @returns Completion percentage (0-100)
 */
export function getCompletionPercentage(message: Message): number {
  if (message.totalChannels === 0) return 0;
  const completed = message.successCount + message.failureCount + message.skipCount;
  return Math.round((completed / message.totalChannels) * 100);
}

/**
 * Checks if a message is in progress
 * @param message - The message to check
 * @returns true if message is currently being sent
 */
export function isInProgress(message: Message): boolean {
  return message.status === MessageStatus.SENDING;
}

/**
 * Checks if a message is completed (successfully or with failures)
 * @param message - The message to check
 * @returns true if message sending is complete
 */
export function isCompleted(message: Message): boolean {
  return message.status === MessageStatus.COMPLETED || message.status === MessageStatus.FAILED;
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