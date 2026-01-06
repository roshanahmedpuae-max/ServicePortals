import { useState, useEffect, useCallback, useRef } from "react";
import { Ticket } from "@/lib/types";

interface UseTicketsOptions {
  businessUnit?: string;
  customerId?: string;
  employeeId?: string;
  status?: string;
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

const cache = new Map<string, { data: Ticket[] | PaginatedResponse<Ticket>; timestamp: number; paginated: boolean }>();
const CACHE_TTL = 60 * 1000; // 1 minute
const pendingRequests = new Map<string, Promise<Ticket[] | PaginatedResponse<Ticket>>>();

export function useTickets(options: UseTicketsOptions = {}) {
  const { businessUnit, customerId, employeeId, status, limit = 100, page = 1 } = options;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginatedResponse<Ticket>["pagination"] | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async (forceRefresh = false) => {
    const cacheKey = `tickets-${businessUnit}-${customerId || "all"}-${employeeId || "all"}-${status || "all"}-${limit}-${page}`;
    const cached = cache.get(cacheKey);
    const now = Date.now();

    if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL) {
      if (cached.paginated) {
        const paginated = cached.data as PaginatedResponse<Ticket>;
        setTickets(paginated.data);
        setPagination(paginated.pagination);
      } else {
        setTickets(cached.data as Ticket[]);
        setPagination(null);
      }
      return;
    }

    if (pendingRequests.has(cacheKey)) {
      try {
        const result = await pendingRequests.get(cacheKey)!;
        if (typeof result === "object" && "data" in result) {
          const paginated = result as PaginatedResponse<Ticket>;
          setTickets(paginated.data);
          setPagination(paginated.pagination);
        } else {
          setTickets(result as Ticket[]);
          setPagination(null);
        }
        return;
      } catch {
        // Continue with new request
      }
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setLoading(true);
    setError(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (limit) params.set("limit", limit.toString());
    if (page > 1) params.set("page", page.toString());

    const fetchPromise = (async () => {
      try {
        const res = await fetch(`/api/tickets?${params.toString()}`, {
          cache: "no-store",
          signal: abortController.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load tickets");
        }
        const json = await res.json();
        
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
          setTickets(result.data);
          setPagination(result.pagination);
        } else {
          setTickets(result.data);
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
  }, [businessUnit, customerId, employeeId, status, limit, page]);

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
    tickets,
    loading,
    error,
    pagination,
    refresh: () => load(true),
  };
}

