/**
 * Error handling and logging service
 * Provides structured error reporting with context
 */

export interface ErrorContext {
  userId?: string;
  operation?: string;
  channelId?: string;
  messageId?: string;
  channelName?: string;
  field?: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}

export interface AppError extends Error {
  code: string;
  statusCode: number;
  context?: ErrorContext;
  isRetryable?: boolean;
}

export class SlackAPIError extends Error implements AppError {
  code: string;
  statusCode: number;
  context?: ErrorContext;
  isRetryable: boolean;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    context?: ErrorContext,
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'SlackAPIError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.isRetryable = isRetryable;
  }
}

export class ValidationError extends Error implements AppError {
  code: string;
  statusCode: number;
  context?: ErrorContext;
  isRetryable: boolean = false;

  constructor(message: string, field?: string, context?: ErrorContext) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
    this.statusCode = 400;
    this.context = { ...context, field };
  }
}

export class AuthenticationError extends Error implements AppError {
  code: string;
  statusCode: number;
  context?: ErrorContext;
  isRetryable: boolean = false;

  constructor(message: string, context?: ErrorContext) {
    super(message);
    this.name = 'AuthenticationError';
    this.code = 'AUTHENTICATION_ERROR';
    this.statusCode = 401;
    this.context = context;
  }
}

export class NotFoundError extends Error implements AppError {
  code: string;
  statusCode: number;
  context?: ErrorContext;
  isRetryable: boolean = false;

  constructor(resource: string, id: string, context?: ErrorContext) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
    this.code = 'NOT_FOUND';
    this.statusCode = 404;
    this.context = { ...context, resource, resourceId: id };
  }
}

export class ChannelError extends Error implements AppError {
  code: string;
  statusCode: number;
  context?: ErrorContext;
  isRetryable: boolean;

  constructor(
    message: string,
    code: string,
    channelId: string,
    channelName: string,
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ChannelError';
    this.code = code;
    this.statusCode = 400;
    this.context = { channelId, channelName };
    this.isRetryable = isRetryable;
  }
}

export enum ErrorCodes {
  // Authentication errors
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Validation errors
  REQUIRED_FIELD = 'REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  LENGTH_EXCEEDED = 'LENGTH_EXCEEDED',
  TOO_MANY_CHANNELS = 'TOO_MANY_CHANNELS',

  // Slack API errors
  CHANNEL_NOT_FOUND = 'CHANNEL_NOT_FOUND',
  CHANNEL_ARCHIVED = 'CHANNEL_ARCHIVED',
  NO_PERMISSION = 'NO_PERMISSION',
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
  RATE_LIMITED = 'RATE_LIMITED',
  SLACK_API_ERROR = 'SLACK_API_ERROR',

  // Channel errors
  CHANNEL_DELETED = 'CHANNEL_DELETED',
  CANNOT_POST_TO_CHANNEL = 'CANNOT_POST_TO_CHANNEL',

  // System errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class ErrorHandler {
  /**
   * Logs error with structured context for monitoring
   */
  static logError(error: Error, context?: ErrorContext): void {
    const errorData = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: (error as AppError).code,
      statusCode: (error as AppError).statusCode,
      context: { ...(error as AppError).context, ...context },
      timestamp: new Date().toISOString(),
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error:', errorData);
    }

    // In production, this would send to Firebase Analytics or other monitoring service
    // analytics.logEvent('error', errorData);
  }

  /**
   * Creates user-friendly error message
   */
  static formatUserMessage(error: Error): string {
    if (error instanceof ValidationError) {
      return error.message;
    }

    if (error instanceof AuthenticationError) {
      return 'Please sign in to continue';
    }

    if (error instanceof NotFoundError) {
      return error.message;
    }

    if (error instanceof ChannelError) {
      const channelName = error.context?.channelName || 'Channel';
      switch (error.code) {
        case ErrorCodes.CHANNEL_ARCHIVED:
          return `Cannot post to ${channelName}: Channel is archived`;
        case ErrorCodes.CHANNEL_DELETED:
          return `Cannot post to ${channelName}: Channel was deleted`;
        case ErrorCodes.NO_PERMISSION:
          return `Cannot post to ${channelName}: Permission denied`;
        default:
          return `Failed to post to ${channelName}: ${error.message}`;
      }
    }

    if (error instanceof SlackAPIError) {
      switch (error.code) {
        case ErrorCodes.RATE_LIMITED:
          return 'Sending too many messages. Please try again in a moment.';
        case ErrorCodes.MESSAGE_TOO_LONG:
          return 'Message is too long. Please shorten your message.';
        default:
          return 'There was a problem with Slack. Please try again.';
      }
    }

    // Generic fallback
    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Converts Slack API error to AppError
   */
  static fromSlackError(slackError: any, context?: ErrorContext): SlackAPIError {
    const error = slackError?.data?.error || slackError?.error || 'unknown';
    let code: string;
    let message: string;
    let isRetryable = false;

    switch (error) {
      case 'channel_not_found':
        code = ErrorCodes.CHANNEL_NOT_FOUND;
        message = 'Channel not found';
        break;
      case 'is_archived':
        code = ErrorCodes.CHANNEL_ARCHIVED;
        message = 'Channel is archived';
        break;
      case 'not_in_channel':
      case 'restricted_action':
        code = ErrorCodes.NO_PERMISSION;
        message = 'No permission to post to channel';
        break;
      case 'msg_too_long':
        code = ErrorCodes.MESSAGE_TOO_LONG;
        message = 'Message too long';
        break;
      case 'rate_limited':
        code = ErrorCodes.RATE_LIMITED;
        message = 'Rate limited';
        isRetryable = true;
        break;
      default:
        code = ErrorCodes.SLACK_API_ERROR;
        message = `Slack API error: ${error}`;
        isRetryable = true;
    }

    return new SlackAPIError(message, code, 400, context, isRetryable);
  }

  /**
   * Handles and formats API response errors
   */
  static handleAPIError(error: Error, context?: ErrorContext) {
    this.logError(error, context);

    if (isAppError(error)) {
      return {
        error: error.code,
        message: this.formatUserMessage(error),
        statusCode: error.statusCode,
      };
    }

    // Unexpected error
    return {
      error: ErrorCodes.UNKNOWN_ERROR,
      message: 'An unexpected error occurred',
      statusCode: 500,
    };
  }

  /**
   * Checks if error is retryable
   */
  static isRetryableError(error: Error): boolean {
    if (isAppError(error)) {
      return error.isRetryable || false;
    }

    // Network errors are generally retryable
    if (error.name === 'NetworkError' || error.message.includes('network')) {
      return true;
    }

    return false;
  }
}

/**
 * Utility function to wrap async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context?: ErrorContext
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    ErrorHandler.logError(error as Error, context);
    throw error;
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: any): error is AppError {
  return error && typeof error === 'object' && 'code' in error && 'statusCode' in error;
}
