import { useEffect, useState, useCallback, useRef } from "react";
import { BusinessUnit, EmployeeStatus } from "@/lib/types";

type OptionCustomer = { id: string; name: string };
type OptionServiceType = { id: string; name: string; description?: string };
type OptionEmployee = {
  id: string;
  name: string;
  role: string;
  status: EmployeeStatus;
  businessUnit: BusinessUnit;
};

type OptionsResponse = {
  customers: OptionCustomer[];
  serviceTypes: OptionServiceType[];
  employees: OptionEmployee[];
};

// Simple in-memory cache with TTL
const cache = new Map<string, { data: OptionsResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Request deduplication
const pendingRequests = new Map<string, Promise<OptionsResponse>>();

export function useBuOptions(businessUnit: BusinessUnit) {
  const [data, setData] = useState<OptionsResponse>({
    customers: [],
    serviceTypes: [],
    employees: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async (forceRefresh = false) => {
    const cacheKey = businessUnit;
    const cached = cache.get(cacheKey);
    const now = Date.now();

    // Return cached data if still valid and not forcing refresh
    if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      return;
    }

    // Deduplicate concurrent requests
    if (pendingRequests.has(cacheKey)) {
      try {
        const result = await pendingRequests.get(cacheKey)!;
        setData(result);
        return;
      } catch (err) {
        // If pending request fails, continue with new request
      }
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setLoading(true);
    setError(null);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const fetchPromise = (async () => {
      try {
        const res = await fetch(`/api/options?bu=${businessUnit}`, {
          cache: "no-store",
          signal: abortController.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load options");
        }
        const json = (await res.json()) as OptionsResponse;
        
        // Update cache
        cache.set(cacheKey, { data: json, timestamp: now });
        
        return json;
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
      const json = await fetchPromise;
      if (!abortController.signal.aborted) {
        setData(json);
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
  }, [businessUnit]);

  useEffect(() => {
    load();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [load]);

  return {
    ...data,
    loading,
    error,
    refresh: () => load(true),
  };
}

