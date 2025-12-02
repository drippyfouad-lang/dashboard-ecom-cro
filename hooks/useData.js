/**
 * CUSTOM HOOK FOR DATA SERVICE
 * React hook interface for the centralized data service
 * Provides SWR-like functionality with automatic revalidation
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import dataService from '@/lib/dataService';

/**
 * Main hook for fetching and caching data
 * 
 * @param {string} key - Unique cache key
 * @param {Function} fetcher - Function that returns a promise with data
 * @param {Object} options - Configuration options
 * @returns {Object} { data, error, loading, mutate, revalidate }
 */
export function useData(key, fetcher, options = {}) {
  const [state, setState] = useState({
    data: dataService.getCached(key),
    error: null,
    loading: dataService.isLoading(key),
  });

  const fetcherRef = useRef(fetcher);
  const optionsRef = useRef(options);

  // Update refs when props change
  useEffect(() => {
    fetcherRef.current = fetcher;
    optionsRef.current = options;
  }, [fetcher, options]);

  // Initial fetch and subscription
  useEffect(() => {
    if (!key || !fetcherRef.current) return;

    let mounted = true;

    // Fetch data
    dataService
      .fetch(key, fetcherRef.current, optionsRef.current)
      .then(data => {
        if (mounted) {
          setState({ data, error: null, loading: false });
        }
      })
      .catch(error => {
        if (mounted) {
          setState(prev => ({ ...prev, error, loading: false }));
        }
      });

    // Subscribe to updates
    const unsubscribe = dataService.subscribe(key, (update) => {
      if (mounted) {
        setState(prev => ({
          data: update.data !== undefined ? update.data : prev.data,
          error: update.error !== undefined ? update.error : prev.error,
          loading: update.loading !== undefined ? update.loading : prev.loading,
        }));
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [key]);

  // Mutate function
  const mutate = useCallback(
    (updater, shouldRevalidate = true) => {
      return dataService.mutate(key, updater, shouldRevalidate);
    },
    [key]
  );

  // Revalidate function
  const revalidate = useCallback(() => {
    return dataService.revalidate(key);
  }, [key]);

  return {
    data: state.data,
    error: state.error,
    loading: state.loading,
    mutate,
    revalidate,
  };
}

/**
 * Hook for dashboard statistics with real-time updates
 */
export function useDashboardStats() {
  return useData(
    'dashboard-stats',
    async () => {
      const response = await fetch('/api/finance/summary?period=30');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch stats');
      return data.data;
    },
    {
      revalidateInterval: 15000, // Poll every 15 seconds
      dedupingInterval: 5000,
    }
  );
}

/**
 * Hook for orders list with smart caching
 */
export function useOrders(params = {}) {
  const key = `orders-${JSON.stringify(params)}`;
  
  return useData(
    key,
    async () => {
      const searchParams = new URLSearchParams(params);
      const response = await fetch(`/api/orders?${searchParams}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch orders');
      return data;
    },
    {
      dedupingInterval: 8000,
      retryCount: 1,
    }
  );
}

/**
 * Hook for products list with smart caching
 */
export function useProducts(params = {}) {
  const key = `products-${JSON.stringify(params)}`;
  
  return useData(
    key,
    async () => {
      const searchParams = new URLSearchParams(params);
      const response = await fetch(`/api/products?${searchParams}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch products');
      return data;
    },
    {
      dedupingInterval: 10000,
      retryCount: 1,
    }
  );
}

/**
 * Hook for categories list with smart caching
 */
export function useCategories(params = {}) {
  const key = `categories-${JSON.stringify(params)}`;
  
  return useData(
    key,
    async () => {
      const searchParams = new URLSearchParams(params);
      const response = await fetch(`/api/categories?${searchParams}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch categories');
      return data;
    },
    {
      dedupingInterval: 15000,
      retryCount: 1,
    }
  );
}

/**
 * Hook for wilayas (rarely changes, long cache)
 */
export function useWilayas() {
  return useData(
    'wilayas-list',
    async () => {
      const response = await fetch('/api/shipping/wilayas?all=true');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch wilayas');
      return data.data;
    },
    {
      dedupingInterval: 300000, // 5 minutes
    }
  );
}

/**
 * Hook for communes (can filter by wilaya)
 */
export function useCommunes(wilayaId = null) {
  const key = wilayaId ? `communes-${wilayaId}` : 'communes-all';
  
  return useData(
    key,
    async () => {
      const params = wilayaId ? `?wilaya=${wilayaId}&all=true` : '?all=true';
      const response = await fetch(`/api/shipping/communes${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch communes');
      return data.data;
    },
    {
      dedupingInterval: 300000, // 5 minutes
    }
  );
}

/**
 * Hook for prefetching all dashboard data
 */
export function usePrefetchDashboard() {
  const [prefetched, setPrefetched] = useState(false);

  useEffect(() => {
    const prefetch = async () => {
      try {
        await dataService.prefetchAll([
          {
            key: 'dashboard-stats',
            fetcher: async () => {
              const response = await fetch('/api/finance/summary?period=30');
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const data = await response.json();
              if (!data.success) throw new Error(data.error);
              return data.data;
            },
            options: { revalidateInterval: 15000 },
          },
          {
            key: 'products-list',
            fetcher: async () => {
              const response = await fetch('/api/products?limit=100');
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const data = await response.json();
              if (!data.success) throw new Error(data.error);
              return data;
            },
            options: { dedupingInterval: 30000 },
          },
          {
            key: 'categories-list',
            fetcher: async () => {
              const response = await fetch('/api/categories?all=true');
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const data = await response.json();
              if (!data.success) throw new Error(data.error);
              return data;
            },
            options: { dedupingInterval: 60000 },
          },
          {
            key: 'wilayas-list',
            fetcher: async () => {
              const response = await fetch('/api/shipping/wilayas?all=true');
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const data = await response.json();
              if (!data.success) throw new Error(data.error);
              return data.data;
            },
            options: { dedupingInterval: 300000 },
          },
        ]);

        setPrefetched(true);
      } catch (error) {
        console.error('Prefetch failed:', error);
      }
    };

    prefetch();
  }, []);

  return prefetched;
}

export default useData;
