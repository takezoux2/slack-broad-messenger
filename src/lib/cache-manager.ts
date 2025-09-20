/**
 * API response caching strategy
 * Implements intelligent caching for improved performance and reduced API calls
 */

import { Channel } from './types/channel';
import { ChannelList } from './types/channel-list';
import { SlackUserInfo } from './slack';
import { Message } from './types/message';

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  staleWhileRevalidate?: boolean; // Serve stale data while fetching fresh
  tags?: string[]; // Cache tags for invalidation
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number;
}

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = {
    hits: 0,
    misses: 0,
  };
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxSize = 1000;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(options: { defaultTTL?: number; maxSize?: number } = {}) {
    this.defaultTTL = options.defaultTTL || this.defaultTTL;

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();

    // Check if entry is expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.stats.hits++;

    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const { ttl = this.defaultTTL, tags = [] } = options;

    const now = Date.now();

    // Check cache size and evict if necessary
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl,
      tags,
      accessCount: 0,
      lastAccessed: now,
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists in cache and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * Invalidate cache entries by tags
   */
  invalidateByTags(tags: string[]): number {
    let invalidated = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      missRate: total > 0 ? this.stats.misses / total : 0,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUp(
    dataFetchers: Array<{ key: string; fetcher: () => Promise<any>; options?: CacheOptions }>
  ): Promise<void> {
    const promises = dataFetchers.map(async ({ key, fetcher, options }) => {
      try {
        const data = await fetcher();
        this.set(key, data, options);
      } catch (error) {
        console.warn(`Failed to warm up cache for key ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Cached fetch function with automatic cache management
   */
  async cachedFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached) {
      // If stale-while-revalidate is enabled, fetch fresh data in background
      if (options.staleWhileRevalidate) {
        this.refreshInBackground(key, fetcher, options);
      }
      return cached;
    }

    // Fetch fresh data
    try {
      const data = await fetcher();
      this.set(key, data, options);
      return data;
    } catch (error) {
      // If we have stale data, return it on fetch error
      const staleData = this.cache.get(key);
      if (staleData) {
        console.warn(`Fetch failed for ${key}, returning stale data:`, error);
        return staleData.data as T;
      }
      throw error;
    }
  }

  /**
   * Batch cache operations for efficiency
   */
  batchSet<T>(entries: Array<{ key: string; data: T; options?: CacheOptions }>): void {
    entries.forEach(({ key, data, options }) => {
      this.set(key, data, options);
    });
  }

  batchGet<T>(keys: string[]): Map<string, T | null> {
    const results = new Map<string, T | null>();

    keys.forEach(key => {
      results.set(key, this.get<T>(key));
    });

    return results;
  }

  batchDelete(keys: string[]): number {
    let deleted = 0;

    keys.forEach(key => {
      if (this.cache.delete(key)) {
        deleted++;
      }
    });

    return deleted;
  }

  /**
   * Export cache for persistence
   */
  export(): Record<string, CacheEntry<any>> {
    const exported: Record<string, CacheEntry<any>> = {};

    for (const [key, entry] of this.cache.entries()) {
      exported[key] = entry;
    }

    return exported;
  }

  /**
   * Import cache from persistence
   */
  import(data: Record<string, CacheEntry<any>>): void {
    const now = Date.now();

    for (const [key, entry] of Object.entries(data)) {
      // Only import non-expired entries
      if (now - entry.timestamp <= entry.ttl) {
        this.cache.set(key, entry);
      }
    }
  }

  /**
   * Private methods
   */
  private evictLeastRecentlyUsed(): void {
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  private startCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000
    );
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));
  }

  private refreshInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): void {
    // Don't wait for this promise
    fetcher()
      .then(data => this.set(key, data, options))
      .catch(error => console.warn(`Background refresh failed for ${key}:`, error));
  }

  private estimateMemoryUsage(): number {
    let size = 0;

    for (const entry of this.cache.values()) {
      // Rough estimation of memory usage
      size += JSON.stringify(entry).length * 2; // 2 bytes per character in UTF-16
    }

    return size;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.clear();
  }
}

// Specialized cache managers for different data types
export class ChannelCacheManager extends CacheManager {
  constructor() {
    super({ defaultTTL: 10 * 60 * 1000 }); // 10 minutes for channels
  }

  async getChannels(teamId: string, fetcher: () => Promise<Channel[]>): Promise<Channel[]> {
    return this.cachedFetch(`channels:${teamId}`, fetcher, {
      ttl: 10 * 60 * 1000,
      tags: ['channels', teamId],
      staleWhileRevalidate: true,
    });
  }

  invalidateChannels(teamId: string): void {
    this.invalidateByTags(['channels', teamId]);
  }
}

export class ChannelListCacheManager extends CacheManager {
  constructor() {
    super({ defaultTTL: 5 * 60 * 1000 }); // 5 minutes for channel lists
  }

  async getChannelLists(
    userId: string,
    fetcher: () => Promise<ChannelList[]>
  ): Promise<ChannelList[]> {
    return this.cachedFetch(`channel-lists:${userId}`, fetcher, {
      ttl: 5 * 60 * 1000,
      tags: ['channel-lists', userId],
      staleWhileRevalidate: true,
    });
  }

  async getChannelList(listId: string, fetcher: () => Promise<ChannelList>): Promise<ChannelList> {
    return this.cachedFetch(`channel-list:${listId}`, fetcher, {
      ttl: 5 * 60 * 1000,
      tags: ['channel-list', listId],
    });
  }

  invalidateUserChannelLists(userId: string): void {
    this.invalidateByTags(['channel-lists', userId]);
  }

  invalidateChannelList(listId: string): void {
    this.invalidateByTags(['channel-list', listId]);
  }
}

export class UserCacheManager extends CacheManager {
  constructor() {
    super({ defaultTTL: 15 * 60 * 1000 }); // 15 minutes for users
  }

  async getSlackUsers(
    teamId: string,
    fetcher: () => Promise<SlackUserInfo[]>
  ): Promise<SlackUserInfo[]> {
    return this.cachedFetch(`slack-users:${teamId}`, fetcher, {
      ttl: 15 * 60 * 1000,
      tags: ['slack-users', teamId],
      staleWhileRevalidate: true,
    });
  }

  invalidateUsers(teamId: string): void {
    this.invalidateByTags(['slack-users', teamId]);
  }
}

export class MessageCacheManager extends CacheManager {
  constructor() {
    super({ defaultTTL: 2 * 60 * 1000 }); // 2 minutes for messages (short-lived)
  }

  async getMessages(userId: string, fetcher: () => Promise<Message[]>): Promise<Message[]> {
    return this.cachedFetch(`messages:${userId}`, fetcher, {
      ttl: 2 * 60 * 1000,
      tags: ['messages', userId],
    });
  }

  async getMessage(messageId: string, fetcher: () => Promise<Message>): Promise<Message> {
    return this.cachedFetch(`message:${messageId}`, fetcher, {
      ttl: 1 * 60 * 1000, // 1 minute for individual messages
      tags: ['message', messageId],
    });
  }

  invalidateUserMessages(userId: string): void {
    this.invalidateByTags(['messages', userId]);
  }

  invalidateMessage(messageId: string): void {
    this.invalidateByTags(['message', messageId]);
  }
}

// Global cache managers
export const channelCache = new ChannelCacheManager();
export const channelListCache = new ChannelListCacheManager();
export const userCache = new UserCacheManager();
export const messageCache = new MessageCacheManager();

// Cache invalidation utilities
export const cacheInvalidation = {
  /**
   * Invalidate all caches for a team
   */
  invalidateTeam(teamId: string): void {
    channelCache.invalidateChannels(teamId);
    userCache.invalidateUsers(teamId);
  },

  /**
   * Invalidate all caches for a user
   */
  invalidateUser(userId: string): void {
    channelListCache.invalidateUserChannelLists(userId);
    messageCache.invalidateUserMessages(userId);
  },

  /**
   * Invalidate all caches
   */
  invalidateAll(): void {
    channelCache.clear();
    channelListCache.clear();
    userCache.clear();
    messageCache.clear();
  },

  /**
   * Get combined cache statistics
   */
  getAllStats(): {
    channels: CacheStats;
    channelLists: CacheStats;
    users: CacheStats;
    messages: CacheStats;
    total: {
      size: number;
      memoryUsage: number;
      hitRate: number;
    };
  } {
    const channelStats = channelCache.getStats();
    const channelListStats = channelListCache.getStats();
    const userStats = userCache.getStats();
    const messageStats = messageCache.getStats();

    const totalHits =
      channelStats.totalHits +
      channelListStats.totalHits +
      userStats.totalHits +
      messageStats.totalHits;
    const totalMisses =
      channelStats.totalMisses +
      channelListStats.totalMisses +
      userStats.totalMisses +
      messageStats.totalMisses;
    const totalRequests = totalHits + totalMisses;

    return {
      channels: channelStats,
      channelLists: channelListStats,
      users: userStats,
      messages: messageStats,
      total: {
        size: channelStats.size + channelListStats.size + userStats.size + messageStats.size,
        memoryUsage:
          channelStats.memoryUsage +
          channelListStats.memoryUsage +
          userStats.memoryUsage +
          messageStats.memoryUsage,
        hitRate: totalRequests > 0 ? totalHits / totalRequests : 0,
      },
    };
  },
};

// React hooks for cache management
export function useCacheStats() {
  return cacheInvalidation.getAllStats();
}

// Utility functions
export function createCacheKey(...parts: (string | number)[]): string {
  return parts.join(':');
}

export function shouldCache(data: any): boolean {
  // Don't cache empty arrays or null values
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return false;
  }

  // Don't cache error responses
  if (data.error) {
    return false;
  }

  return true;
}

export function getCacheTTL(dataType: 'static' | 'dynamic' | 'realtime'): number {
  switch (dataType) {
    case 'static':
      return 60 * 60 * 1000; // 1 hour
    case 'dynamic':
      return 5 * 60 * 1000; // 5 minutes
    case 'realtime':
      return 30 * 1000; // 30 seconds
    default:
      return 5 * 60 * 1000;
  }
}

// Cache warming strategies
export const cacheWarming = {
  /**
   * Pre-load essential data for a user
   */
  async warmUpUser(userId: string, teamId: string): Promise<void> {
    const promises = [
      // Warm up channels
      channelCache.warmUp([
        {
          key: `channels:${teamId}`,
          fetcher: async () => {
            // This would be replaced with actual API call
            return [];
          },
          options: { tags: ['channels', teamId] },
        },
      ]),

      // Warm up user's channel lists
      channelListCache.warmUp([
        {
          key: `channel-lists:${userId}`,
          fetcher: async () => {
            // This would be replaced with actual API call
            return [];
          },
          options: { tags: ['channel-lists', userId] },
        },
      ]),

      // Warm up Slack users
      userCache.warmUp([
        {
          key: `slack-users:${teamId}`,
          fetcher: async () => {
            // This would be replaced with actual API call
            return [];
          },
          options: { tags: ['slack-users', teamId] },
        },
      ]),
    ];

    await Promise.allSettled(promises);
  },

  /**
   * Pre-load data based on user behavior patterns
   */
  async warmUpFromBehavior(patterns: {
    frequentlyAccessedChannelLists: string[];
    recentMessages: string[];
  }): Promise<void> {
    // This would implement predictive caching based on user behavior
    console.log('Warming up cache based on behavior patterns:', patterns);
  },
};
