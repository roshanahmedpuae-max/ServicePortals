import { useState, useEffect, useCallback, useRef } from "react";
import { WorkOrder } from "@/lib/types";

interface UseWorkOrdersOptions {
  businessUnit?: string;
  employeeId?: string;
  limit?: number;
  page?: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

// Simple cache with TTL
const cache = new Map<string, { data: WorkOrder[] | PaginatedResponse<WorkOrder>; timestamp: number; paginated: boolean }>();
const CACHE_TTL = 60 * 1000; // 1 minute
const pendingRequests = new Map<string, Promise<WorkOrder[] | PaginatedResponse<WorkOrder>>>();

export function useWorkOrders(options: UseWorkOrdersOptions = {}) {
  const { businessUnit, employeeId, limit = 100, page = 1 } = options;
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginatedResponse<WorkOrder>["pagination"] | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async (forceRefresh = false) => {
    const cacheKey = `workOrders-${businessUnit}-${employeeId || "all"}-${limit}-${page}`;
    const cached = cache.get(cacheKey);
    const now = Date.now();

    // Return cached data if still valid
    if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL) {
      if (cached.paginated) {
        const paginated = cached.data as PaginatedResponse<WorkOrder>;
        setWorkOrders(paginated.data);
        setPagination(paginated.pagination);
      } else {
        setWorkOrders(cached.data as WorkOrder[]);
        setPagination(null);
      }
      return;
    }

    // Deduplicate concurrent requests
    if (pendingRequests.has(cacheKey)) {
      try {
        const result = await pendingRequests.get(cacheKey)!;
        if (typeof result === "object" && "data" in result) {
          const paginated = result as PaginatedResponse<WorkOrder>;
          setWorkOrders(paginated.data);
          setPagination(paginated.pagination);
        } else {
          setWorkOrders(result as WorkOrder[]);
          setPagination(null);
        }
        return;
      } catch {
        // Continue with new request if pending fails
      }
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setLoading(true);
    setError(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const params = new URLSearchParams();
    if (limit) params.set("limit", limit.toString());
    if (page > 1) params.set("page", page.toString());

    const fetchPromise = (async () => {
      try {
        const res = await fetch(`/api/work-orders?${params.toString()}`, {
          cache: "no-store",
          signal: abortController.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load work orders");
        }
        const json = await res.json();
        
        // Handle both paginated and non-paginated responses
        const isPaginated = typeof json === "object" && "data" in json && "pagination" in json;
        const result = isPaginated ? json : { data: json, pagination: null };
        
        cache.set(cacheKey, { data: result, timestamp: now, paginated: isPaginated });
        
        return result;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          throw err;
        }
        throw err;
      } finally {
        pendingRequests.delete(cacheKey);
      }
    })();

    pendingRequests.set(cacheKey, fetchPromise);

    try {
      const result = await fetchPromise;
      if (!abortController.signal.aborted) {
        if (result.pagination) {
          setWorkOrders(result.data);
          setPagination(result.pagination);
        } else {
          setWorkOrders(result.data);
          setPagination(null);
        }
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        setError((err as Error).message);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
      abortControllerRef.current = null;
    }
  }, [businessUnit, employeeId, limit, page]);

  useEffect(() => {
    if (businessUnit) {
      load();
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [load, businessUnit]);

  return {
    workOrders,
    loading,
    error,
    pagination,
    refresh: () => load(true),
  };
}

