/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from 'ethers';

interface CacheEntry {
  data: any;
  timestamp: number;
  expiresIn: number;
}

class SwapDataCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly defaultTTL = 30000; // 30 seconds

  set(key: string, data: any, ttl: number = this.defaultTTL) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn: ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.expiresIn;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear() {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const isExpired = Date.now() - entry.timestamp > entry.expiresIn;
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

// Singleton cache instance
export const swapCache = new SwapDataCache();

// Optimized request fetcher with batching and caching
export class OptimizedSwapFetcher {
  private contract: ethers.Contract | null = null;

  initialize(_provider: ethers.JsonRpcProvider, contract: ethers.Contract) {
    this.contract = contract;
  }

  async getTotalRequests(): Promise<number> {
    if (!this.contract) throw new Error('Contract not initialized');

    const cacheKey = 'total-requests';
    const cached = swapCache.get(cacheKey);
    if (cached !== null) return cached;

    const total = await this.contract.getTotalRequests();
    const result = Number(total);
    swapCache.set(cacheKey, result, 10000); // Cache for 10 seconds
    return result;
  }

  async getRequestsBatch(startIndex: number, endIndex: number): Promise<any[]> {
    if (!this.contract) throw new Error('Contract not initialized');

    const cacheKey = `requests-${startIndex}-${endIndex}`;
    const cached = swapCache.get(cacheKey);
    if (cached !== null) return cached;

    const batchSize = 10;
    const results: any[] = [];

    for (let batch = startIndex; batch <= endIndex; batch += batchSize) {
      const batchEnd = Math.min(batch + batchSize - 1, endIndex);
      const batchPromises = [];

      for (let i = batch; i <= batchEnd; i++) {
        batchPromises.push(
          this.contract.getRequest(i).catch(() => null)
        );
      }

      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach((result: any, index: number) => {
        if (result && result.amount.toString() !== "0") {
          results.push({
            id: batch + index,
            requestor: result[0],
            receiver: result[1],
            amount: ethers.formatEther(result[2]),
            timestamp: Number(result[3]),
            status: result[4]
          });
        }
      });
    }

    swapCache.set(cacheKey, results, 20000); // Cache for 20 seconds
    return results;
  }

  async getUserRequests(userAddress: string, maxResults: number = 30): Promise<any[]> {
    if (!userAddress) return [];

    const cacheKey = `user-requests-${userAddress.toLowerCase()}`;
    const cached = swapCache.get(cacheKey);
    if (cached !== null) return cached;

    const totalRequests = await this.getTotalRequests();
    if (totalRequests === 0) return [];

    const startIndex = Math.max(1, totalRequests - maxResults + 1);
    const endIndex = totalRequests;

    const allRequests = await this.getRequestsBatch(startIndex, endIndex);
    const userRequests = allRequests.filter(req => 
      req.requestor.toLowerCase() === userAddress.toLowerCase()
    );

    swapCache.set(cacheKey, userRequests, 15000); // Cache for 15 seconds
    return userRequests;
  }

  async getPendingRequests(maxResults: number = 50): Promise<any[]> {
    const cacheKey = 'pending-requests';
    const cached = swapCache.get(cacheKey);
    if (cached !== null) return cached;

    const totalRequests = await this.getTotalRequests();
    if (totalRequests === 0) return [];

    const startIndex = Math.max(1, totalRequests - maxResults + 1);
    const endIndex = totalRequests;

    const allRequests = await this.getRequestsBatch(startIndex, endIndex);
    const pendingRequests = allRequests.filter(req => Number(req.status) === 1); // Status.Pending = 1

    swapCache.set(cacheKey, pendingRequests, 15000); // Cache for 15 seconds
    return pendingRequests;
  }

  clearCache() {
    swapCache.clear();
  }
}

// Singleton fetcher instance
export const optimizedFetcher = new OptimizedSwapFetcher();
