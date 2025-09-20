/**
 * Performance optimization for large channel lists
 * Implements efficient operations for handling large datasets
 */

import { collection, query, where, limit, startAfter, getDocs, orderBy } from 'firebase/firestore';
import { Channel } from './types/channel';
import { ChannelList } from './types/channel-list';
import { getFirebaseFirestore } from './firebase';

export interface PaginationOptions {
  limit?: number;
  startAfter?: any;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  nextPageToken?: any;
  hasMore: boolean;
  total?: number;
}

export class PerformanceOptimizer {
  private db = getFirebaseFirestore();

  /**
   * Paginated channel loading with virtual scrolling support
   */
  async getPaginatedChannels(
    teamId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<Channel>> {
    const {
      limit: pageSize = 50,
      startAfter: startAfterDoc,
      orderBy: orderField = 'name',
      orderDirection = 'asc',
    } = options;

    try {
      let channelsQuery = query(
        collection(this.db, 'channels'),
        where('teamId', '==', teamId),
        where('isDeleted', '==', false),
        orderBy(orderField, orderDirection),
        limit(pageSize + 1) // Get one extra to check if there are more
      );

      if (startAfterDoc) {
        channelsQuery = query(channelsQuery, startAfter(startAfterDoc));
      }

      const snapshot = await getDocs(channelsQuery);
      const channels: Channel[] = [];
      let lastDoc: any = null;

      snapshot.docs.forEach((doc, index) => {
        if (index < pageSize) {
          channels.push(doc.data() as Channel);
          lastDoc = doc;
        }
      });

      const hasMore = snapshot.docs.length > pageSize;

      return {
        items: channels,
        nextPageToken: hasMore ? lastDoc : undefined,
        hasMore,
      };
    } catch (error) {
      throw new Error(`Failed to load paginated channels: ${(error as Error).message}`);
    }
  }

  /**
   * Efficient channel search with debouncing and caching
   */
  private searchCache = new Map<string, { timestamp: number; results: Channel[] }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async searchChannels(
    teamId: string,
    searchTerm: string,
    options: { maxResults?: number; useCache?: boolean } = {}
  ): Promise<Channel[]> {
    const { maxResults = 100, useCache = true } = options;
    const cacheKey = `${teamId}:${searchTerm.toLowerCase()}`;

    // Check cache first
    if (useCache && this.searchCache.has(cacheKey)) {
      const cached = this.searchCache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < this.CACHE_TTL) {
        return cached.results.slice(0, maxResults);
      }
      this.searchCache.delete(cacheKey);
    }

    try {
      // For Firestore, we need to get all channels and filter client-side
      // In a production app, you'd want to use Algolia or similar for full-text search
      const channelsQuery = query(
        collection(this.db, 'channels'),
        where('teamId', '==', teamId),
        where('isDeleted', '==', false),
        orderBy('name')
      );

      const snapshot = await getDocs(channelsQuery);
      const allChannels = snapshot.docs.map(doc => doc.data() as Channel);

      // Client-side filtering for search
      const searchLower = searchTerm.toLowerCase();
      const filteredChannels = allChannels.filter(
        channel =>
          channel.name.toLowerCase().includes(searchLower) ||
          (channel.displayName && channel.displayName.toLowerCase().includes(searchLower)) ||
          (channel.purpose && channel.purpose.toLowerCase().includes(searchLower))
      );

      // Cache results
      if (useCache) {
        this.searchCache.set(cacheKey, {
          timestamp: Date.now(),
          results: filteredChannels,
        });
      }

      return filteredChannels.slice(0, maxResults);
    } catch (error) {
      throw new Error(`Failed to search channels: ${(error as Error).message}`);
    }
  }

  /**
   * Batch process channel lists with progress reporting
   */
  async batchProcessChannelLists<T>(
    channelLists: ChannelList[],
    processor: (channelList: ChannelList) => Promise<T>,
    options: {
      batchSize?: number;
      concurrency?: number;
      onProgress?: (completed: number, total: number) => void;
      onError?: (error: Error, channelList: ChannelList) => void;
    } = {}
  ): Promise<Array<{ channelList: ChannelList; result: T | null; error: Error | null }>> {
    const { batchSize = 10, concurrency = 3, onProgress, onError } = options;

    const results: Array<{ channelList: ChannelList; result: T | null; error: Error | null }> = [];
    let completed = 0;

    // Process in batches to avoid memory issues
    for (let i = 0; i < channelLists.length; i += batchSize) {
      const batch = channelLists.slice(i, i + batchSize);

      // Process batch with limited concurrency
      const batchPromises = batch.map(async (channelList, index) => {
        // Stagger starts to avoid thundering herd
        if (index > 0) {
          await this.delay(index * 100);
        }

        try {
          const result = await processor(channelList);
          completed++;
          if (onProgress) {
            onProgress(completed, channelLists.length);
          }
          return { channelList, result, error: null };
        } catch (error) {
          completed++;
          if (onError) {
            onError(error as Error, channelList);
          }
          if (onProgress) {
            onProgress(completed, channelLists.length);
          }
          return { channelList, result: null, error: error as Error };
        }
      });

      // Process with concurrency limit
      const batchResults = await this.processConcurrently(batchPromises, concurrency);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Memory-efficient channel validation for large lists
   */
  async validateChannelsEfficiently(
    channelIds: string[],
    teamId: string,
    options: { chunkSize?: number; validateArchived?: boolean } = {}
  ): Promise<{
    valid: string[];
    invalid: string[];
    archived: string[];
    deleted: string[];
  }> {
    const { chunkSize = 100, validateArchived = true } = options;
    const results = {
      valid: [] as string[],
      invalid: [] as string[],
      archived: [] as string[],
      deleted: [] as string[],
    };

    // Process in chunks to avoid hitting Firestore limits
    for (let i = 0; i < channelIds.length; i += chunkSize) {
      const chunk = channelIds.slice(i, i + chunkSize);

      try {
        // Query for this chunk of channels
        const channelsQuery = query(
          collection(this.db, 'channels'),
          where('id', 'in', chunk),
          where('teamId', '==', teamId)
        );

        const snapshot = await getDocs(channelsQuery);
        const foundChannels = new Map<string, Channel>();

        snapshot.docs.forEach(doc => {
          const channel = doc.data() as Channel;
          foundChannels.set(channel.id, channel);
        });

        // Categorize channels
        chunk.forEach(channelId => {
          const channel = foundChannels.get(channelId);

          if (!channel) {
            results.invalid.push(channelId);
          } else if (channel.isDeleted) {
            results.deleted.push(channelId);
          } else if (validateArchived && channel.isArchived) {
            results.archived.push(channelId);
          } else {
            results.valid.push(channelId);
          }
        });
      } catch (error) {
        // If chunk fails, mark all as invalid
        chunk.forEach(channelId => results.invalid.push(channelId));
      }
    }

    return results;
  }

  /**
   * Optimize large channel list rendering with virtualization hints
   */
  getVirtualizationConfig(itemCount: number): {
    shouldVirtualize: boolean;
    estimatedItemSize: number;
    bufferSize: number;
    chunkSize: number;
  } {
    // Virtualize for large lists to improve performance
    if (itemCount > 100) {
      return {
        shouldVirtualize: true,
        estimatedItemSize: 48, // Approximate height of a channel item in pixels
        bufferSize: 10, // Number of items to render outside visible area
        chunkSize: Math.min(50, Math.ceil(itemCount / 10)), // Dynamic chunk size
      };
    }

    return {
      shouldVirtualize: false,
      estimatedItemSize: 48,
      bufferSize: 0,
      chunkSize: itemCount,
    };
  }

  /**
   * Memory usage monitoring and cleanup
   */
  private memoryStats = {
    cacheSize: 0,
    lastCleanup: Date.now(),
  };

  cleanupCache(): void {
    const now = Date.now();

    // Clean expired search cache entries
    for (const [key, value] of this.searchCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.searchCache.delete(key);
      }
    }

    this.memoryStats.cacheSize = this.searchCache.size;
    this.memoryStats.lastCleanup = now;
  }

  getMemoryStats(): {
    cacheSize: number;
    lastCleanup: number;
    cacheEntries: number;
  } {
    return {
      cacheSize: this.memoryStats.cacheSize,
      lastCleanup: this.memoryStats.lastCleanup,
      cacheEntries: this.searchCache.size,
    };
  }

  /**
   * Helper method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Process promises with concurrency limit
   */
  private async processConcurrently<T>(promises: Promise<T>[], concurrency: number): Promise<T[]> {
    const results: T[] = [];
    const executing: Promise<any>[] = [];

    for (const promise of promises) {
      const wrappedPromise = promise.then(result => {
        // Remove from executing when done
        executing.splice(executing.indexOf(wrappedPromise), 1);
        return result;
      });

      results.push(wrappedPromise as any);
      executing.push(wrappedPromise);

      if (executing.length >= concurrency) {
        await Promise.race(executing);
      }
    }

    return Promise.all(results);
  }

  /**
   * Get performance recommendations based on usage patterns
   */
  getPerformanceRecommendations(stats: {
    averageChannelListSize: number;
    searchFrequency: number;
    userCount: number;
  }): string[] {
    const recommendations: string[] = [];

    if (stats.averageChannelListSize > 200) {
      recommendations.push(
        'Consider breaking down large channel lists into smaller, more manageable groups'
      );
    }

    if (stats.searchFrequency > 10) {
      recommendations.push(
        'High search frequency detected. Consider implementing search result caching'
      );
    }

    if (stats.userCount > 100) {
      recommendations.push(
        'Large user base detected. Consider implementing server-side filtering and pagination'
      );
    }

    if (this.searchCache.size > 1000) {
      recommendations.push(
        'Search cache is growing large. Consider implementing cache size limits'
      );
    }

    return recommendations;
  }

  /**
   * Preload channels for better perceived performance
   */
  async preloadChannels(
    teamId: string,
    priority: 'recent' | 'popular' | 'alphabetical' = 'recent'
  ): Promise<void> {
    try {
      let orderField = 'lastSyncAt';
      let orderDirection: 'asc' | 'desc' = 'desc';

      switch (priority) {
        case 'popular':
          orderField = 'memberCount';
          orderDirection = 'desc';
          break;
        case 'alphabetical':
          orderField = 'name';
          orderDirection = 'asc';
          break;
        default:
          orderField = 'lastSyncAt';
          orderDirection = 'desc';
      }

      // Load first page into cache
      await this.getPaginatedChannels(teamId, {
        limit: 50,
        orderBy: orderField,
        orderDirection,
      });
    } catch (error) {
      // Preloading failure shouldn't affect main functionality
      console.warn('Channel preloading failed:', error);
    }
  }
}

// Export singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

// React hook for using performance optimizer
export function usePerformanceOptimizer() {
  return performanceOptimizer;
}

// Export utility functions
export function shouldUseVirtualization(itemCount: number): boolean {
  return itemCount > 100;
}

export function getOptimalBatchSize(itemCount: number): number {
  if (itemCount < 10) return itemCount;
  if (itemCount < 100) return 10;
  if (itemCount < 1000) return 25;
  return 50;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function executedFunction(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function measurePerformance<T>(
  name: string,
  operation: () => T | Promise<T>
): T | Promise<T> {
  const start = performance.now();

  const result = operation();

  if (result instanceof Promise) {
    return result.finally(() => {
      const end = performance.now();
      console.log(`${name} took ${end - start} milliseconds`);
    });
  } else {
    const end = performance.now();
    console.log(`${name} took ${end - start} milliseconds`);
    return result;
  }
}

// Export memory management utilities
export const memoryUtils = {
  /**
   * Monitor memory usage and trigger cleanup if needed
   */
  monitorMemory: () => {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in performance) {
      const memory = (performance as any).memory;
      const usage = memory.usedJSHeapSize / memory.totalJSHeapSize;

      if (usage > 0.8) {
        performanceOptimizer.cleanupCache();
      }

      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        usage,
      };
    }

    return null;
  },

  /**
   * Create a memory-efficient object pool
   */
  createObjectPool: <T>(factory: () => T, reset: (obj: T) => void, maxSize = 100) => {
    const pool: T[] = [];

    return {
      acquire: (): T => {
        return pool.pop() || factory();
      },

      release: (obj: T): void => {
        if (pool.length < maxSize) {
          reset(obj);
          pool.push(obj);
        }
      },

      clear: (): void => {
        pool.length = 0;
      },

      size: (): number => pool.length,
    };
  },
};
