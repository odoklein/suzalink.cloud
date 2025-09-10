// Client-side cache for instant message loading
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class MessageCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Cache keys
  static getConversationsKey(userId: string): string {
    return `conversations:${userId}`;
  }

  static getMessagesKey(conversationId: string): string {
    return `messages:${conversationId}`;
  }

  static getUsersKey(): string {
    return 'users:all';
  }

  static getConversationKey(conversationId: string): string {
    return `conversation:${conversationId}`;
  }
}

export const messageCache = new MessageCache();

// Cache utilities
export const getCachedData = <T>(key: string): T | null => {
  return messageCache.get<T>(key);
};

export const setCachedData = <T>(key: string, data: T, ttl?: number): void => {
  messageCache.set(key, data, ttl);
};

export const invalidateCache = (pattern: string): void => {
  // Simple pattern matching for cache invalidation
  if (pattern === 'conversations') {
    // Clear all conversation-related cache
    messageCache.clear();
  }
};
