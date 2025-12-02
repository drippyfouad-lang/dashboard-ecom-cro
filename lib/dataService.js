/**
 * CENTRALIZED DATA SERVICE
 * Real-time data synchronization with intelligent caching and revalidation
 * 
 * Features:
 * - Smart prefetching on dashboard load
 * - Automatic revalidation after mutations
 * - Background polling for real-time updates
 * - Global state management
 * - Error handling and retry logic
 */

class DataService {
  constructor() {
    this.cache = new Map();
    this.subscribers = new Map();
    this.pollingIntervals = new Map();
    this.loadingStates = new Map();
  }

  /**
   * Fetch data with caching and revalidation
   */
  async fetch(key, fetcher, options = {}) {
    const {
      revalidateOnFocus = true,
      revalidateInterval = null,
      dedupingInterval = 5000,
      retryCount = 2,
      retryDelay = 1000,
    } = options;

    // Return cached data immediately if available
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      const age = Date.now() - cached.timestamp;
      
      // Return cached data if still fresh
      if (age < dedupingInterval) {
        return cached.data;
      }
    }

    // Set loading state
    this.loadingStates.set(key, true);
    this.notifySubscribers(key, { loading: true });

    try {
      // Execute fetcher with retry logic
      const data = await this.fetchWithRetry(fetcher, retryCount, retryDelay);
      
      // Cache the result
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
      });

      // Set up polling if interval specified
      if (revalidateInterval && !this.pollingIntervals.has(key)) {
        this.startPolling(key, fetcher, revalidateInterval);
      }

      // Notify subscribers
      this.loadingStates.set(key, false);
      this.notifySubscribers(key, { data, loading: false, error: null });

      return data;
    } catch (error) {
      this.loadingStates.set(key, false);
      this.notifySubscribers(key, { data: null, loading: false, error });
      throw error;
    }
  }

  /**
   * Fetch with retry logic
   */
  async fetchWithRetry(fetcher, retryCount, retryDelay) {
    let lastError;
    
    for (let i = 0; i <= retryCount; i++) {
      try {
        return await fetcher();
      } catch (error) {
        lastError = error;
        if (i < retryCount) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Start polling for a key
   */
  startPolling(key, fetcher, interval) {
    if (this.pollingIntervals.has(key)) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        const data = await fetcher();
        this.cache.set(key, {
          data,
          timestamp: Date.now(),
        });
        this.notifySubscribers(key, { data, loading: false, error: null });
      } catch (error) {
        console.error(`Polling error for ${key}:`, error);
      }
    }, interval);

    this.pollingIntervals.set(key, intervalId);
  }

  /**
   * Stop polling for a key
   */
  stopPolling(key) {
    if (this.pollingIntervals.has(key)) {
      clearInterval(this.pollingIntervals.get(key));
      this.pollingIntervals.delete(key);
    }
  }

  /**
   * Subscribe to data changes
   */
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    
    this.subscribers.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(key);
          this.stopPolling(key);
        }
      }
    };
  }

  /**
   * Notify all subscribers of a key
   */
  notifySubscribers(key, update) {
    const subs = this.subscribers.get(key);
    if (subs) {
      subs.forEach(callback => callback(update));
    }
  }

  /**
   * Mutate (update) cached data and revalidate
   */
  async mutate(key, updater, shouldRevalidate = true) {
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      const newData = typeof updater === 'function' ? updater(cached.data) : updater;
      
      this.cache.set(key, {
        data: newData,
        timestamp: Date.now(),
      });

      this.notifySubscribers(key, { data: newData, loading: false, error: null });
    }

    // Optionally revalidate
    if (shouldRevalidate && this.cache.has(key)) {
      // Trigger refetch in background
      setTimeout(() => {
        const cached = this.cache.get(key);
        if (cached && cached.fetcher) {
          this.fetch(key, cached.fetcher);
        }
      }, 0);
    }
  }

  /**
   * Invalidate cache and force refetch
   */
  async revalidate(key) {
    this.cache.delete(key);
    this.notifySubscribers(key, { loading: true });
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.cache.clear();
    this.pollingIntervals.forEach(interval => clearInterval(interval));
    this.pollingIntervals.clear();
  }

  /**
   * Prefetch multiple resources in parallel
   */
  async prefetchAll(resources) {
    const promises = resources.map(({ key, fetcher, options }) =>
      this.fetch(key, fetcher, options).catch(err => {
        console.error(`Prefetch failed for ${key}:`, err);
        return null;
      })
    );

    return Promise.all(promises);
  }

  /**
   * Get cached data without fetching
   */
  getCached(key) {
    const cached = this.cache.get(key);
    return cached ? cached.data : null;
  }

  /**
   * Check if data is loading
   */
  isLoading(key) {
    return this.loadingStates.get(key) || false;
  }
}

// Create singleton instance
const dataService = new DataService();

/**
 * Pre-configured fetchers for common resources
 */
export const fetchers = {
  dashboard: async () => {
    const response = await fetch('/api/finance/summary?period=30');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch dashboard');
    return data.data;
  },

  orders: async (params = {}) => {
    const searchParams = new URLSearchParams(params);
    const response = await fetch(`/api/orders?${searchParams}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch orders');
    return data;
  },

  products: async (params = {}) => {
    const searchParams = new URLSearchParams(params);
    const response = await fetch(`/api/products?${searchParams}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch products');
    return data;
  },

  categories: async (params = {}) => {
    const searchParams = new URLSearchParams(params);
    const response = await fetch(`/api/categories?${searchParams}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch categories');
    return data;
  },

  wilayas: async () => {
    const response = await fetch('/api/shipping/wilayas?all=true');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch wilayas');
    return data.data;
  },

  communes: async (wilayaId) => {
    const params = wilayaId ? `?wilaya=${wilayaId}&all=true` : '?all=true';
    const response = await fetch(`/api/shipping/communes${params}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch communes');
    return data.data;
  },

  users: async () => {
    const response = await fetch('/api/users');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Failed to fetch users');
    return data.data;
  },
};

/**
 * Prefetch all essential data for dashboard
 */
export async function prefetchDashboardData() {
  return dataService.prefetchAll([
    {
      key: 'dashboard-stats',
      fetcher: fetchers.dashboard,
      options: { revalidateInterval: 15000 }, // Poll every 15 seconds
    },
    {
      key: 'products-list',
      fetcher: () => fetchers.products({ limit: 100 }),
      options: { dedupingInterval: 30000 },
    },
    {
      key: 'categories-list',
      fetcher: () => fetchers.categories({ all: true }),
      options: { dedupingInterval: 60000 },
    },
    {
      key: 'wilayas-list',
      fetcher: fetchers.wilayas,
      options: { dedupingInterval: 300000 }, // 5 minutes
    },
    {
      key: 'communes-list',
      fetcher: () => fetchers.communes(),
      options: { dedupingInterval: 300000 },
    },
  ]);
}

export default dataService;
