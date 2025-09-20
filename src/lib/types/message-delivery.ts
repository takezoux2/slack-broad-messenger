/**
 * Delivery status enum
 */
export enum DeliveryStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

/**
 * Represents a single message delivery to a channel
 * Storage: Firestore subcollection under messages
 */
export interface MessageDelivery {
  /** Auto-generated document ID */
  id: string;
  /** Parent Message ID */
  messageId: string;
  /** Target Slack channel ID */
  channelId: string;
  /** Channel name for display */
  channelName: string;
  /** Delivery status */
  status: DeliveryStatus;
  /** Slack message ID if successful */
  slackMessageId?: string;
  /** Error code if failed */
  errorCode?: string;
  /** Human-readable error message */
  errorMessage?: string;
  /** Number of retry attempts */
  retryCount: number;
  /** When delivery was attempted */
  sentAt?: Date;
  /** When delivery completed (success/fail) */
  completedAt?: Date;
}

/**
 * Validation error for MessageDelivery data
 */
export class MessageDeliveryValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'MessageDeliveryValidationError';
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
 * Validates if a string is a valid Slack channel ID format
 * Slack channel IDs should match pattern: C followed by 10 alphanumeric characters
 */
function isValidChannelId(channelId: string): boolean {
  return typeof channelId === 'string' && /^C[A-Z0-9]{10}$/.test(channelId);
}

/**
 * Validates if a channel name meets requirements
 * Must be non-empty string
 */
function isValidChannelName(channelName: string): boolean {
  return typeof channelName === 'string' && channelName.trim().length > 0;
}

/**
 * Validates if a delivery status is valid
 */
function isValidDeliveryStatus(status: DeliveryStatus): boolean {
  return status === DeliveryStatus.PENDING || 
         status === DeliveryStatus.SUCCESS || 
         status === DeliveryStatus.FAILED || 
         status === DeliveryStatus.SKIPPED;
}

/**
 * Validates if a Slack message ID format is valid
 * Slack message IDs are typically timestamp-based strings
 */
function isValidSlackMessageId(messageId: string): boolean {
  return typeof messageId === 'string' && messageId.trim().length > 0;
}

/**
 * Validates a MessageDelivery object according to the data model rules
 * @param delivery - The message delivery object to validate
 * @throws MessageDeliveryValidationError if validation fails
 */
export function validateMessageDelivery(delivery: Partial<MessageDelivery>): asserts delivery is MessageDelivery {
  if (!delivery.id || !isValidDocumentId(delivery.id)) {
    throw new MessageDeliveryValidationError('id is required and must be a non-empty string', 'id');
  }

  if (!delivery.messageId || !isValidDocumentId(delivery.messageId)) {
    throw new MessageDeliveryValidationError('messageId is required and must be a valid document ID', 'messageId');
  }

  if (!delivery.channelId || !isValidChannelId(delivery.channelId)) {
    throw new MessageDeliveryValidationError('channelId must be a valid Slack channel ID format', 'channelId');
  }

  if (!delivery.channelName || !isValidChannelName(delivery.channelName)) {
    throw new MessageDeliveryValidationError('channelName is required and must be a non-empty string', 'channelName');
  }

  if (!delivery.status || !isValidDeliveryStatus(delivery.status)) {
    throw new MessageDeliveryValidationError('status must be a valid DeliveryStatus', 'status');
  }

  if (typeof delivery.retryCount !== 'number' || delivery.retryCount < 0) {
    throw new MessageDeliveryValidationError('retryCount must be a non-negative number', 'retryCount');
  }

  // slackMessageId is optional, but if provided should be valid
  if (delivery.slackMessageId !== undefined && !isValidSlackMessageId(delivery.slackMessageId)) {
    throw new MessageDeliveryValidationError('slackMessageId must be a non-empty string if provided', 'slackMessageId');
  }

  // errorCode is optional, but if provided should be non-empty string
  if (delivery.errorCode !== undefined && (typeof delivery.errorCode !== 'string' || delivery.errorCode.trim().length === 0)) {
    throw new MessageDeliveryValidationError('errorCode must be a non-empty string if provided', 'errorCode');
  }

  // errorMessage is optional, but if provided should be non-empty string
  if (delivery.errorMessage !== undefined && (typeof delivery.errorMessage !== 'string' || delivery.errorMessage.trim().length === 0)) {
    throw new MessageDeliveryValidationError('errorMessage must be a non-empty string if provided', 'errorMessage');
  }

  // sentAt is optional, but if provided should be a Date
  if (delivery.sentAt !== undefined && !(delivery.sentAt instanceof Date)) {
    throw new MessageDeliveryValidationError('sentAt must be a valid Date if provided', 'sentAt');
  }

  // completedAt is optional, but if provided should be a Date
  if (delivery.completedAt !== undefined && !(delivery.completedAt instanceof Date)) {
    throw new MessageDeliveryValidationError('completedAt must be a valid Date if provided', 'completedAt');
  }

  // Status-based validation
  if (delivery.status === DeliveryStatus.SUCCESS) {
    if (!delivery.slackMessageId) {
      throw new MessageDeliveryValidationError('successful deliveries must have slackMessageId', 'slackMessageId');
    }
    if (!delivery.completedAt) {
      throw new MessageDeliveryValidationError('successful deliveries must have completedAt', 'completedAt');
    }
    if (delivery.errorCode || delivery.errorMessage) {
      throw new MessageDeliveryValidationError('successful deliveries should not have error fields', 'status');
    }
  }

  if (delivery.status === DeliveryStatus.FAILED) {
    if (!delivery.completedAt) {
      throw new MessageDeliveryValidationError('failed deliveries must have completedAt', 'completedAt');
    }
    if (delivery.slackMessageId) {
      throw new MessageDeliveryValidationError('failed deliveries should not have slackMessageId', 'slackMessageId');
    }
  }

  if (delivery.status === DeliveryStatus.SKIPPED) {
    if (!delivery.completedAt) {
      throw new MessageDeliveryValidationError('skipped deliveries must have completedAt', 'completedAt');
    }
    if (delivery.slackMessageId) {
      throw new MessageDeliveryValidationError('skipped deliveries should not have slackMessageId', 'slackMessageId');
    }
  }

  if (delivery.status === DeliveryStatus.PENDING) {
    if (delivery.slackMessageId || delivery.completedAt) {
      throw new MessageDeliveryValidationError('pending deliveries should not have slackMessageId or completedAt', 'status');
    }
  }
}

/**
 * Checks if a delivery is completed (success, failed, or skipped)
 * @param delivery - The delivery to check
 * @returns true if delivery is in a final state
 */
export function isDeliveryCompleted(delivery: MessageDelivery): boolean {
  return delivery.status === DeliveryStatus.SUCCESS || 
         delivery.status === DeliveryStatus.FAILED || 
         delivery.status === DeliveryStatus.SKIPPED;
}

/**
 * Checks if a delivery was successful
 * @param delivery - The delivery to check
 * @returns true if delivery was successful
 */
export function isDeliverySuccessful(delivery: MessageDelivery): boolean {
  return delivery.status === DeliveryStatus.SUCCESS;
}

/**
 * Checks if a delivery failed
 * @param delivery - The delivery to check
 * @returns true if delivery failed
 */
export function isDeliveryFailed(delivery: MessageDelivery): boolean {
  return delivery.status === DeliveryStatus.FAILED;
}

/**
 * Checks if a delivery was skipped
 * @param delivery - The delivery to check
 * @returns true if delivery was skipped
 */
export function isDeliverySkipped(delivery: MessageDelivery): boolean {
  return delivery.status === DeliveryStatus.SKIPPED;
}

/**
 * Gets a human-readable status description
 * @param delivery - The delivery to get status for
 * @returns Human-readable status string
 */
export function getDeliveryStatusDescription(delivery: MessageDelivery): string {
  switch (delivery.status) {
    case DeliveryStatus.PENDING:
      return 'Waiting to send';
    case DeliveryStatus.SUCCESS:
      return 'Successfully delivered';
    case DeliveryStatus.FAILED:
      return delivery.errorMessage || 'Failed to deliver';
    case DeliveryStatus.SKIPPED:
      return 'Skipped (channel deleted)';
    default:
      return 'Unknown status';
  }
}

/**
 * Creates a new MessageDelivery object with validation
 * @param deliveryData - Partial delivery data to create a MessageDelivery from
 * @returns Validated MessageDelivery object
 * @throws MessageDeliveryValidationError if validation fails
 */
export function createMessageDelivery(deliveryData: Partial<MessageDelivery>): MessageDelivery {
  validateMessageDelivery(deliveryData);
  return deliveryData as MessageDelivery;
}

/**
 * Type guard to check if an object is a valid MessageDelivery
 * @param obj - Object to check
 * @returns true if obj is a valid MessageDelivery
 */
export function isMessageDelivery(obj: any): obj is MessageDelivery {
  try {
    validateMessageDelivery(obj);
    return true;
  } catch {
    return false;
  }
}