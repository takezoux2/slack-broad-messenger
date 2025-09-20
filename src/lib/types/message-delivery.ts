import { Timestamp } from 'firebase/firestore';

/**
 * Delivery status enumeration
 */
export enum DeliveryStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

/**
 * Tracks individual channel delivery results
 * Storage: Firestore subcollection under Message
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
  sentAt?: Timestamp;
  /** When delivery completed (success/fail) */
  completedAt?: Timestamp;
}

/**
 * Validation errors for MessageDelivery
 */
export interface MessageDeliveryValidationError {
  field: string;
  message: string;
}

/**
 * Validation result for MessageDelivery
 */
export interface MessageDeliveryValidationResult {
  isValid: boolean;
  errors: MessageDeliveryValidationError[];
}

/**
 * Validates a MessageDelivery object
 */
export function validateMessageDelivery(delivery: any): MessageDeliveryValidationResult {
  const errors: MessageDeliveryValidationError[] = [];

  // Required field validations
  if (!delivery.id || typeof delivery.id !== 'string' || delivery.id.trim() === '') {
    errors.push({
      field: 'id',
      message: 'Delivery ID is required and must be a non-empty string',
    });
  }

  if (
    !delivery.messageId ||
    typeof delivery.messageId !== 'string' ||
    delivery.messageId.trim() === ''
  ) {
    errors.push({
      field: 'messageId',
      message: 'Message ID is required and must be a non-empty string',
    });
  }

  if (
    !delivery.channelId ||
    typeof delivery.channelId !== 'string' ||
    delivery.channelId.trim() === ''
  ) {
    errors.push({
      field: 'channelId',
      message: 'Channel ID is required and must be a non-empty string',
    });
  }

  if (
    !delivery.channelName ||
    typeof delivery.channelName !== 'string' ||
    delivery.channelName.trim() === ''
  ) {
    errors.push({
      field: 'channelName',
      message: 'Channel name is required and must be a non-empty string',
    });
  }

  // Status validation
  if (!delivery.status || !Object.values(DeliveryStatus).includes(delivery.status)) {
    errors.push({
      field: 'status',
      message: 'Status must be one of: pending, success, failed, skipped',
    });
  }

  // Retry count validation
  if (
    typeof delivery.retryCount !== 'number' ||
    delivery.retryCount < 0 ||
    !Number.isInteger(delivery.retryCount)
  ) {
    errors.push({
      field: 'retryCount',
      message: 'Retry count must be a non-negative integer',
    });
  }

  // Slack channel ID format validation
  if (
    delivery.channelId &&
    typeof delivery.channelId === 'string' &&
    !delivery.channelId.match(/^C[A-Z0-9]+$/)
  ) {
    errors.push({
      field: 'channelId',
      message:
        'Channel ID must follow Slack channel ID format (C followed by alphanumeric characters)',
    });
  }

  // Optional field validations
  if (delivery.slackMessageId !== undefined) {
    if (typeof delivery.slackMessageId !== 'string' || delivery.slackMessageId.trim() === '') {
      errors.push({
        field: 'slackMessageId',
        message: 'Slack message ID must be a non-empty string',
      });
    }
  }

  if (delivery.errorCode !== undefined) {
    if (typeof delivery.errorCode !== 'string' || delivery.errorCode.trim() === '') {
      errors.push({
        field: 'errorCode',
        message: 'Error code must be a non-empty string',
      });
    }
  }

  if (delivery.errorMessage !== undefined) {
    if (typeof delivery.errorMessage !== 'string' || delivery.errorMessage.trim() === '') {
      errors.push({
        field: 'errorMessage',
        message: 'Error message must be a non-empty string',
      });
    } else if (delivery.errorMessage.length > 1000) {
      errors.push({
        field: 'errorMessage',
        message: 'Error message must not exceed 1000 characters',
      });
    }
  }

  // Timestamp validations
  if (delivery.sentAt !== undefined && !(delivery.sentAt instanceof Timestamp)) {
    errors.push({
      field: 'sentAt',
      message: 'sentAt must be a Firebase Timestamp',
    });
  }

  if (delivery.completedAt !== undefined && !(delivery.completedAt instanceof Timestamp)) {
    errors.push({
      field: 'completedAt',
      message: 'completedAt must be a Firebase Timestamp',
    });
  }

  // Timestamp sequence validation
  if (
    delivery.completedAt &&
    delivery.sentAt &&
    delivery.completedAt.toMillis() < delivery.sentAt.toMillis()
  ) {
    errors.push({
      field: 'completedAt',
      message: 'completedAt must be after sentAt',
    });
  }

  // Status-specific validations
  if (delivery.status === DeliveryStatus.SUCCESS) {
    if (!delivery.slackMessageId) {
      errors.push({
        field: 'slackMessageId',
        message: 'Slack message ID is required when status is success',
      });
    }
    if (!delivery.completedAt) {
      errors.push({
        field: 'completedAt',
        message: 'completedAt is required when status is success',
      });
    }
  }

  if (delivery.status === DeliveryStatus.FAILED) {
    if (!delivery.errorMessage) {
      errors.push({
        field: 'errorMessage',
        message: 'Error message is required when status is failed',
      });
    }
    if (!delivery.completedAt) {
      errors.push({
        field: 'completedAt',
        message: 'completedAt is required when status is failed',
      });
    }
  }

  if (delivery.status === DeliveryStatus.SKIPPED) {
    if (!delivery.completedAt) {
      errors.push({
        field: 'completedAt',
        message: 'completedAt is required when status is skipped',
      });
    }
  }

  // Logical validations
  if (delivery.status === DeliveryStatus.SUCCESS && (delivery.errorCode || delivery.errorMessage)) {
    errors.push({
      field: 'status',
      message: 'Successful deliveries should not have error codes or messages',
    });
  }

  if (
    delivery.status === DeliveryStatus.PENDING &&
    (delivery.slackMessageId || delivery.completedAt)
  ) {
    errors.push({
      field: 'status',
      message: 'Pending deliveries should not have slack message ID or completion timestamp',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a MessageDelivery object with default values
 */
export function createMessageDelivery(data: Partial<MessageDelivery>): MessageDelivery {
  return {
    id: data.id || '',
    messageId: data.messageId || '',
    channelId: data.channelId || '',
    channelName: data.channelName || '',
    status: data.status || DeliveryStatus.PENDING,
    slackMessageId: data.slackMessageId,
    errorCode: data.errorCode,
    errorMessage: data.errorMessage,
    retryCount: data.retryCount ?? 0,
    sentAt: data.sentAt,
    completedAt: data.completedAt,
  };
}

/**
 * Type guard to check if an object is a valid MessageDelivery
 */
export function isMessageDelivery(obj: any): obj is MessageDelivery {
  const result = validateMessageDelivery(obj);
  return result.isValid;
}

/**
 * Marks a delivery as successful
 */
export function markDeliverySuccess(
  delivery: MessageDelivery,
  slackMessageId: string
): MessageDelivery {
  return {
    ...delivery,
    status: DeliveryStatus.SUCCESS,
    slackMessageId,
    completedAt: Timestamp.now(),
  };
}

/**
 * Marks a delivery as failed
 */
export function markDeliveryFailed(
  delivery: MessageDelivery,
  errorCode: string,
  errorMessage: string
): MessageDelivery {
  return {
    ...delivery,
    status: DeliveryStatus.FAILED,
    errorCode,
    errorMessage,
    completedAt: Timestamp.now(),
  };
}

/**
 * Marks a delivery as skipped (for deleted channels)
 */
export function markDeliverySkipped(delivery: MessageDelivery, reason: string): MessageDelivery {
  return {
    ...delivery,
    status: DeliveryStatus.SKIPPED,
    errorMessage: reason,
    completedAt: Timestamp.now(),
  };
}

/**
 * Increments the retry count for a delivery
 */
export function incrementRetryCount(delivery: MessageDelivery): MessageDelivery {
  return {
    ...delivery,
    retryCount: delivery.retryCount + 1,
  };
}

/**
 * Starts a delivery attempt (sets sentAt timestamp)
 */
export function startDeliveryAttempt(delivery: MessageDelivery): MessageDelivery {
  return {
    ...delivery,
    sentAt: Timestamp.now(),
  };
}

/**
 * Checks if a delivery is in a final state
 */
export function isDeliveryFinished(delivery: MessageDelivery): boolean {
  return (
    delivery.status === DeliveryStatus.SUCCESS ||
    delivery.status === DeliveryStatus.FAILED ||
    delivery.status === DeliveryStatus.SKIPPED
  );
}

/**
 * Checks if a delivery is pending
 */
export function isDeliveryPending(delivery: MessageDelivery): boolean {
  return delivery.status === DeliveryStatus.PENDING;
}

/**
 * Checks if a delivery was successful
 */
export function isDeliverySuccessful(delivery: MessageDelivery): boolean {
  return delivery.status === DeliveryStatus.SUCCESS;
}

/**
 * Checks if a delivery failed
 */
export function isDeliveryFailed(delivery: MessageDelivery): boolean {
  return delivery.status === DeliveryStatus.FAILED;
}

/**
 * Checks if a delivery was skipped
 */
export function isDeliverySkipped(delivery: MessageDelivery): boolean {
  return delivery.status === DeliveryStatus.SKIPPED;
}

/**
 * Gets a human-readable status description
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
      return delivery.errorMessage || 'Skipped';
    default:
      return 'Unknown status';
  }
}
