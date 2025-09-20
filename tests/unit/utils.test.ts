import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Timestamp } from 'firebase/firestore';

// Import utility functions from various modules
import { formatProgress, getStatusColor } from '../../src/lib/progress-tracker';

import {
  withRateLimit,
  batchWithRateLimit,
  createRateLimitedFunction,
} from '../../src/lib/rate-limiter';

import {
  withErrorHandling,
  isAppError,
  ErrorHandler,
  AppError,
  ValidationError,
  SlackAPIError,
  NotFoundError,
  AuthenticationError,
} from '../../src/lib/error-handler';

// Import types needed for testing
import { MessageStatus } from '../../src/lib/types/message';
import { DeliveryStatus } from '../../src/lib/types/message-delivery';
import { ProgressUpdate } from '../../src/lib/progress-tracker';

/**
 * Unit tests for utility functions
 * Tests utility functions from various modules in the application
 */

describe('Progress Tracker Utilities', () => {
  describe('formatProgress', () => {
    it('should format completed progress correctly', () => {
      const progress: ProgressUpdate = {
        messageId: 'test-message',
        status: MessageStatus.COMPLETED,
        totalChannels: 10,
        completedChannels: 10,
        successCount: 8,
        failureCount: 1,
        skipCount: 1,
        pendingCount: 0,
        progressPercentage: 100,
        currentChannel: undefined,
        lastUpdated: new Date(),
      };

      const result = formatProgress(progress);
      expect(result).toBe('Completed: 8 successful, 1 failed, 1 skipped');
    });

    it('should format sending progress correctly', () => {
      const progress: ProgressUpdate = {
        messageId: 'test-message',
        status: MessageStatus.SENDING,
        totalChannels: 20,
        completedChannels: 12,
        successCount: 10,
        failureCount: 1,
        skipCount: 1,
        pendingCount: 8,
        progressPercentage: 60,
        currentChannel: 'C1234567890',
        lastUpdated: new Date(),
      };

      const result = formatProgress(progress);
      expect(result).toBe('Sending... 12/20 (60%)');
    });

    it('should format other statuses correctly', () => {
      const progress: ProgressUpdate = {
        messageId: 'test-message',
        status: MessageStatus.DRAFT,
        totalChannels: 5,
        completedChannels: 0,
        successCount: 0,
        failureCount: 0,
        skipCount: 0,
        pendingCount: 5,
        progressPercentage: 0,
        currentChannel: undefined,
        lastUpdated: new Date(),
      };

      const result = formatProgress(progress);
      expect(result).toBe('Status: draft');
    });
  });

  describe('getStatusColor', () => {
    it('should return correct colors for message statuses', () => {
      expect(getStatusColor(MessageStatus.COMPLETED)).toBe('green');
      expect(getStatusColor(MessageStatus.FAILED)).toBe('red');
      expect(getStatusColor(MessageStatus.SENDING)).toBe('blue');
      expect(getStatusColor(MessageStatus.DRAFT)).toBe('gray');
    });

    it('should return correct colors for delivery statuses', () => {
      expect(getStatusColor(DeliveryStatus.SUCCESS)).toBe('green');
      expect(getStatusColor(DeliveryStatus.FAILED)).toBe('red');
      expect(getStatusColor(DeliveryStatus.PENDING)).toBe('blue');
      expect(getStatusColor(DeliveryStatus.SKIPPED)).toBe('gray');
    });

    it('should return gray for unknown statuses', () => {
      expect(getStatusColor('unknown' as any)).toBe('gray');
    });
  });
});

describe('Rate Limiter Utilities', () => {
  describe('withRateLimit', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should execute operation with rate limiting', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');

      const promise = withRateLimit(mockOperation, 'standard');

      // Advance timers to allow rate limiter to process
      await vi.advanceTimersByTimeAsync(100);

      const result = await promise;

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should handle operation failures', async () => {
      const mockError = new Error('Operation failed');
      const mockOperation = vi.fn().mockRejectedValue(mockError);

      await expect(withRateLimit(mockOperation, 'chat')).rejects.toThrow('Operation failed');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('batchWithRateLimit', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should process items in batches with rate limiting', async () => {
      const items = [1, 2, 3, 4, 5];
      const operation = vi.fn().mockImplementation((item: number) => Promise.resolve(item * 2));
      const onProgress = vi.fn();

      const promise = batchWithRateLimit(items, operation, {
        concurrency: 2,
        onProgress,
      });

      // Advance timers to allow rate limiter to process
      await vi.advanceTimersByTimeAsync(1000);

      const results = await promise;

      expect(results).toEqual([2, 4, 6, 8, 10]);
      expect(operation).toHaveBeenCalledTimes(5);
      expect(onProgress).toHaveBeenCalled();
    });

    it('should handle partial failures in batch processing', async () => {
      const items = [1, 2, 3];
      const operation = vi
        .fn()
        .mockResolvedValueOnce(2)
        .mockRejectedValueOnce(new Error('Failed item'))
        .mockResolvedValueOnce(6);

      await expect(batchWithRateLimit(items, operation)).rejects.toThrow('Failed item');
      expect(operation).toHaveBeenCalledTimes(2); // Should stop on first failure
    });
  });

  describe('createRateLimitedFunction', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should create a rate limited version of a function', async () => {
      const originalFunction = vi.fn().mockResolvedValue('result');
      const rateLimitedFunction = createRateLimitedFunction(originalFunction, 'users');

      const promise = rateLimitedFunction('arg1', 'arg2');

      // Advance timers to allow rate limiter to process
      await vi.advanceTimersByTimeAsync(100);

      const result = await promise;

      expect(result).toBe('result');
      expect(originalFunction).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });
});

describe('Error Handler Utilities', () => {
  describe('withErrorHandling', () => {
    it('should execute operation successfully', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withErrorHandling(operation, {
        operation: 'TEST_OP',
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should handle and transform errors', async () => {
      const mockError = new Error('Original error');
      const operation = vi.fn().mockRejectedValue(mockError);

      await expect(
        withErrorHandling(operation, {
          operation: 'TEST_OP',
        })
      ).rejects.toThrow();

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should pass through AppErrors unchanged', async () => {
      const appError = new ValidationError('Custom validation error', 'testField');
      const operation = vi.fn().mockRejectedValue(appError);

      await expect(
        withErrorHandling(operation, {
          operation: 'TEST_OP',
        })
      ).rejects.toThrow('Custom validation error');

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('isAppError', () => {
    it('should identify AppError instances', () => {
      const appError = new ValidationError('Test error', 'testField');

      expect(isAppError(appError)).toBe(true);
    });

    it('should reject regular errors', () => {
      const regularError = new Error('Regular error');
      expect(isAppError(regularError)).toBe(false);
    });

    it('should reject non-error objects', () => {
      expect(isAppError(null)).toBe(false);
      expect(isAppError(undefined)).toBe(false);
      expect(isAppError('string')).toBe(false);
      expect(isAppError({})).toBe(false);
    });
  });

  describe('ErrorHandler static methods', () => {
    it('should format user messages correctly', () => {
      const error = new Error('Technical error message');
      const userMessage = ErrorHandler.formatUserMessage(error);

      expect(typeof userMessage).toBe('string');
      expect(userMessage.length).toBeGreaterThan(0);
    });

    it('should check if errors are retryable', () => {
      const retryableError = new SlackAPIError(
        'Network error',
        'network_error',
        500,
        undefined,
        true
      );
      const nonRetryableError = new ValidationError('Validation error', 'testField');

      expect(ErrorHandler.isRetryableError(retryableError)).toBe(true);
      expect(ErrorHandler.isRetryableError(nonRetryableError)).toBe(false);
    });

    it('should create different types of errors', () => {
      const validationError = new ValidationError('Validation failed', 'testField');
      const slackError = new SlackAPIError('Slack failed', 'not_found', 404);
      const notFoundError = new NotFoundError('User', 'user123');
      const authError = new AuthenticationError('Auth failed');

      expect(validationError.code).toBe('VALIDATION_ERROR');
      expect(slackError.code).toBe('not_found');
      expect(notFoundError.code).toBe('NOT_FOUND');
      expect(authError.code).toBe('AUTHENTICATION_ERROR');
    });
  });
});

describe('Timestamp and Date Utilities', () => {
  it('should handle Firestore Timestamp conversions', () => {
    const now = new Date();
    const timestamp = Timestamp.fromDate(now);

    expect(timestamp.toDate().getTime()).toBeCloseTo(now.getTime(), -2);
  });

  it('should handle timestamp comparisons', () => {
    const earlier = Timestamp.fromDate(new Date('2023-01-01'));
    const later = Timestamp.fromDate(new Date('2023-12-31'));

    expect(earlier.toMillis()).toBeLessThan(later.toMillis());
  });

  it('should create timestamps from current time', () => {
    const timestamp = Timestamp.now();
    const now = Date.now();

    expect(Math.abs(timestamp.toMillis() - now)).toBeLessThan(1000);
  });
});

describe('String and Data Transformation Utilities', () => {
  it('should handle JSON serialization safely', () => {
    const data = { test: 'value', number: 42 };
    const serialized = JSON.stringify(data);
    const parsed = JSON.parse(serialized);

    expect(parsed).toEqual(data);
  });

  it('should handle base64 encoding and decoding', () => {
    const originalString = 'Hello, World! 🌍';
    const encoded = Buffer.from(originalString, 'utf-8').toString('base64');
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');

    expect(decoded).toBe(originalString);
  });

  it('should handle URL encoding and decoding', () => {
    const originalString = 'Hello World & Special Characters!';
    const encoded = encodeURIComponent(originalString);
    const decoded = decodeURIComponent(encoded);

    expect(decoded).toBe(originalString);
  });
});

describe('Array and Object Utilities', () => {
  it('should handle array chunking simulation', () => {
    const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const chunkSize = 3;
    const chunks: number[][] = [];

    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }

    expect(chunks).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
  });

  it('should handle object property filtering', () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    const filtered = Object.fromEntries(Object.entries(obj).filter(([_, value]) => value > 2));

    expect(filtered).toEqual({ c: 3, d: 4 });
  });

  it('should handle array deduplication', () => {
    const arrayWithDuplicates = [1, 2, 2, 3, 3, 3, 4];
    const unique = [...new Set(arrayWithDuplicates)];

    expect(unique).toEqual([1, 2, 3, 4]);
  });
});

describe('Type Guards and Validation Utilities', () => {
  it('should validate object shapes', () => {
    const isValidUser = (obj: any): obj is { id: string; name: string } => {
      return obj && typeof obj.id === 'string' && typeof obj.name === 'string';
    };

    expect(isValidUser({ id: '123', name: 'John' })).toBe(true);
    expect(isValidUser({ id: 123, name: 'John' })).toBe(false);
    expect(isValidUser(null)).toBe(false);
  });

  it('should check for empty values', () => {
    const isEmpty = (value: any): boolean => {
      if (value === null || value === undefined) return true;
      if (typeof value === 'string') return value.trim().length === 0;
      if (Array.isArray(value)) return value.length === 0;
      if (typeof value === 'object') return Object.keys(value).length === 0;
      return false;
    };

    expect(isEmpty(null)).toBe(true);
    expect(isEmpty('')).toBe(true);
    expect(isEmpty('  ')).toBe(true);
    expect(isEmpty([])).toBe(true);
    expect(isEmpty({})).toBe(true);
    expect(isEmpty('hello')).toBe(false);
    expect(isEmpty([1])).toBe(false);
    expect(isEmpty({ a: 1 })).toBe(false);
  });
});

describe('Promise and Async Utilities', () => {
  it('should handle promise delays', async () => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const start = Date.now();
    await delay(50);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some timing variance
  });

  it('should handle promise timeouts', async () => {
    const timeoutPromise = <T>(promise: Promise<T>, ms: number): Promise<T> => {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), ms)
      );

      return Promise.race([promise, timeout]);
    };

    const slowPromise = new Promise(resolve => setTimeout(() => resolve('done'), 100));

    await expect(timeoutPromise(slowPromise, 50)).rejects.toThrow('Timeout');
  });

  it('should handle promise retries', async () => {
    let attempts = 0;
    const unreliableOperation = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary failure');
      }
      return 'success';
    };

    const retry = async <T>(operation: () => Promise<T>, maxAttempts: number = 3): Promise<T> => {
      let lastError: Error;

      for (let i = 0; i < maxAttempts; i++) {
        try {
          return await operation();
        } catch (error) {
          lastError = error as Error;
          if (i === maxAttempts - 1) throw lastError;
        }
      }

      throw lastError!;
    };

    const result = await retry(unreliableOperation);
    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });
});

describe('Edge Cases and Error Conditions', () => {
  it('should handle malformed data gracefully', () => {
    const safeJsonParse = (str: string): any => {
      try {
        return JSON.parse(str);
      } catch {
        return null;
      }
    };

    expect(safeJsonParse('{"valid": true}')).toEqual({ valid: true });
    expect(safeJsonParse('invalid json')).toBeNull();
    expect(safeJsonParse('')).toBeNull();
  });

  it('should handle null and undefined values', () => {
    const safeAccess = (obj: any, path: string): any => {
      const keys = path.split('.');
      let current = obj;

      for (const key of keys) {
        if (current == null) return undefined;
        current = current[key];
      }

      return current;
    };

    const testObj = { a: { b: { c: 'value' } } };

    expect(safeAccess(testObj, 'a.b.c')).toBe('value');
    expect(safeAccess(testObj, 'a.b.d')).toBeUndefined();
    expect(safeAccess(null, 'a.b.c')).toBeUndefined();
    expect(safeAccess(testObj, 'x.y.z')).toBeUndefined();
  });
});
