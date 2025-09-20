/**
 * Rate limiting for Slack API calls
 * Implements exponential backoff and respects Slack API rate limits
 */

export interface RateLimitConfig {
  /** Maximum requests per second */
  maxRequestsPerSecond: number;
  /** Maximum requests per minute */
  maxRequestsPerMinute: number;
  /** Initial delay for exponential backoff (ms) */
  initialDelayMs: number;
  /** Maximum delay for exponential backoff (ms) */
  maxDelayMs: number;
  /** Maximum number of retries */
  maxRetries: number;
  /** Jitter factor for randomization (0-1) */
  jitterFactor: number;
}

export interface RateLimitState {
  /** Requests made in current second */
  requestsThisSecond: number;
  /** Requests made in current minute */
  requestsThisMinute: number;
  /** Current second window */
  currentSecond: number;
  /** Current minute window */
  currentMinute: number;
  /** Queue of pending requests */
  queue: Array<{
    resolve: (value: any) => void;
    reject: (error: any) => void;
    operation: () => Promise<any>;
    retries: number;
  }>;
  /** Whether processing is active */
  isProcessing: boolean;
}

/**
 * Default rate limit configuration for Slack API
 */
const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequestsPerSecond: 1, // Slack recommends 1 request per second for most endpoints
  maxRequestsPerMinute: 50, // Conservative limit
  initialDelayMs: 1000, // 1 second initial delay
  maxDelayMs: 60000, // 1 minute maximum delay
  maxRetries: 3,
  jitterFactor: 0.1, // 10% jitter
};

export class RateLimiter {
  private config: RateLimitConfig;
  private state: RateLimitState;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      requestsThisSecond: 0,
      requestsThisMinute: 0,
      currentSecond: this.getCurrentSecond(),
      currentMinute: this.getCurrentMinute(),
      queue: [],
      isProcessing: false,
    };
  }

  /**
   * Execute an operation with rate limiting
   */
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.state.queue.push({
        resolve,
        reject,
        operation,
        retries: 0,
      });

      this.processQueue();
    });
  }

  /**
   * Process the request queue
   */
  private async processQueue(): Promise<void> {
    if (this.state.isProcessing || this.state.queue.length === 0) {
      return;
    }

    this.state.isProcessing = true;

    while (this.state.queue.length > 0) {
      // Update time windows
      this.updateTimeWindows();

      // Check if we can make a request
      if (this.canMakeRequest()) {
        const item = this.state.queue.shift()!;
        await this.executeRequest(item);
      } else {
        // Wait before checking again
        await this.waitForNextSlot();
      }
    }

    this.state.isProcessing = false;
  }

  /**
   * Execute a single request with retry logic
   */
  private async executeRequest(item: {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    operation: () => Promise<any>;
    retries: number;
  }): Promise<void> {
    try {
      // Increment counters
      this.state.requestsThisSecond++;
      this.state.requestsThisMinute++;

      // Execute the operation
      const result = await item.operation();
      item.resolve(result);
    } catch (error) {
      // Check if this is a rate limit error
      if (this.isRateLimitError(error) && item.retries < this.config.maxRetries) {
        // Calculate exponential backoff delay
        const delay = this.calculateBackoffDelay(item.retries);

        console.log(
          `Rate limit hit, retrying in ${delay}ms (attempt ${item.retries + 1}/${this.config.maxRetries})`
        );

        // Schedule retry
        setTimeout(() => {
          item.retries++;
          this.state.queue.unshift(item); // Add back to front of queue
          this.processQueue();
        }, delay);
      } else {
        // Non-retryable error or max retries exceeded
        item.reject(error);
      }
    }
  }

  /**
   * Check if we can make a request within rate limits
   */
  private canMakeRequest(): boolean {
    this.updateTimeWindows();

    return (
      this.state.requestsThisSecond < this.config.maxRequestsPerSecond &&
      this.state.requestsThisMinute < this.config.maxRequestsPerMinute
    );
  }

  /**
   * Wait for the next available slot
   */
  private async waitForNextSlot(): Promise<void> {
    const now = Date.now();
    const currentSecond = Math.floor(now / 1000);
    const currentMinute = Math.floor(now / 60000);

    let waitTime = 0;

    // If we're at the second limit, wait until next second
    if (this.state.requestsThisSecond >= this.config.maxRequestsPerSecond) {
      waitTime = Math.max(waitTime, (currentSecond + 1) * 1000 - now);
    }

    // If we're at the minute limit, wait until next minute
    if (this.state.requestsThisMinute >= this.config.maxRequestsPerMinute) {
      waitTime = Math.max(waitTime, (currentMinute + 1) * 60000 - now);
    }

    // Minimum wait time of 100ms to prevent tight loops
    waitTime = Math.max(waitTime, 100);

    await this.sleep(waitTime);
  }

  /**
   * Update time windows and reset counters if needed
   */
  private updateTimeWindows(): void {
    const currentSecond = this.getCurrentSecond();
    const currentMinute = this.getCurrentMinute();

    // Reset second counter if we're in a new second
    if (currentSecond !== this.state.currentSecond) {
      this.state.currentSecond = currentSecond;
      this.state.requestsThisSecond = 0;
    }

    // Reset minute counter if we're in a new minute
    if (currentMinute !== this.state.currentMinute) {
      this.state.currentMinute = currentMinute;
      this.state.requestsThisMinute = 0;
    }
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoffDelay(retryCount: number): number {
    const baseDelay = this.config.initialDelayMs * Math.pow(2, retryCount);
    const jitter = baseDelay * this.config.jitterFactor * Math.random();
    const delay = baseDelay + jitter;

    return Math.min(delay, this.config.maxDelayMs);
  }

  /**
   * Check if an error is a rate limit error
   */
  private isRateLimitError(error: any): boolean {
    // Slack API rate limit errors
    if (error?.data?.error === 'rate_limited') {
      return true;
    }

    // HTTP 429 Too Many Requests
    if (error?.status === 429 || error?.response?.status === 429) {
      return true;
    }

    // Check error message for rate limit indicators
    const errorMessage = error?.message?.toLowerCase() || '';
    return (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests') ||
      errorMessage.includes('429')
    );
  }

  /**
   * Get current second timestamp
   */
  private getCurrentSecond(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Get current minute timestamp
   */
  private getCurrentMinute(): number {
    return Math.floor(Date.now() / 60000);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.state.queue.length;
  }

  /**
   * Get current rate limit status
   */
  getStatus(): {
    requestsThisSecond: number;
    requestsThisMinute: number;
    queueSize: number;
    isProcessing: boolean;
    canMakeRequest: boolean;
  } {
    this.updateTimeWindows();

    return {
      requestsThisSecond: this.state.requestsThisSecond,
      requestsThisMinute: this.state.requestsThisMinute,
      queueSize: this.state.queue.length,
      isProcessing: this.state.isProcessing,
      canMakeRequest: this.canMakeRequest(),
    };
  }

  /**
   * Clear the queue (useful for cleanup)
   */
  clearQueue(): void {
    this.state.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    this.state.queue = [];
  }

  /**
   * Reset rate limit counters
   */
  reset(): void {
    this.state.requestsThisSecond = 0;
    this.state.requestsThisMinute = 0;
    this.state.currentSecond = this.getCurrentSecond();
    this.state.currentMinute = this.getCurrentMinute();
    this.clearQueue();
  }
}

/**
 * Global rate limiter instance for Slack API
 */
export const slackRateLimiter = new RateLimiter();

/**
 * Specialized rate limiter for different Slack API endpoints
 */
export const slackRateLimiters = {
  // Standard endpoints (most API calls)
  standard: new RateLimiter({
    maxRequestsPerSecond: 1,
    maxRequestsPerMinute: 50,
  }),

  // Conversations endpoints (channels.list, conversations.members, etc.)
  conversations: new RateLimiter({
    maxRequestsPerSecond: 1,
    maxRequestsPerMinute: 20, // More conservative for conversations
  }),

  // Chat endpoints (chat.postMessage)
  chat: new RateLimiter({
    maxRequestsPerSecond: 1,
    maxRequestsPerMinute: 60, // Higher limit for message sending
  }),

  // Users endpoints (users.list, users.info)
  users: new RateLimiter({
    maxRequestsPerSecond: 1,
    maxRequestsPerMinute: 30,
  }),
};

/**
 * Rate limit wrapper for Slack API calls
 */
export async function withRateLimit<T>(
  operation: () => Promise<T>,
  limiterType: 'standard' | 'conversations' | 'chat' | 'users' = 'standard'
): Promise<T> {
  const limiter = slackRateLimiters[limiterType];
  return limiter.execute(operation);
}

/**
 * Batch rate limited operations with concurrency control
 */
export async function batchWithRateLimit<T, R>(
  items: T[],
  operation: (item: T) => Promise<R>,
  options: {
    concurrency?: number;
    limiterType?: 'standard' | 'conversations' | 'chat' | 'users';
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<R[]> {
  const { concurrency = 3, limiterType = 'standard', onProgress } = options;

  const results: R[] = [];
  const limiter = slackRateLimiters[limiterType];

  // Process items in batches with concurrency control
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);

    const batchResults = await Promise.allSettled(
      batch.map(item => limiter.execute(() => operation(item)))
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        throw result.reason;
      }
    }

    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + concurrency, items.length), items.length);
    }
  }

  return results;
}

/**
 * Utility to create a rate limited version of a function
 */
export function createRateLimitedFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  limiterType: 'standard' | 'conversations' | 'chat' | 'users' = 'standard'
): T {
  const limiter = slackRateLimiters[limiterType];

  return ((...args: Parameters<T>): ReturnType<T> => {
    return limiter.execute(() => fn(...args)) as ReturnType<T>;
  }) as unknown as T;
}
