import { useState, useEffect, useCallback, useRef } from "react";
import { BusinessUnit } from "@/lib/types";

interface AdminData {
  customers: any[];
  serviceTypes: any[];
  employees: any[];
  workOrders: any[];
  tickets: any[];
  payrolls: any[];
  dailySchedules: any[];
  rentalMachines: any[];
  copierModels: any[];
  assetDates: any[];
  assetsSummary: any;
  customerUsers: any[];
  assetNotifications: any[];
}

const cache = new Map<string, { data: Partial<AdminData>; timestamp: number }>();
const CACHE_TTL = 30 * 1000; // 30 seconds
const pendingRequests = new Map<string, Promise<Partial<AdminData>>>();

export function useAdminData(businessUnit: BusinessUnit | null, authedFetch: (url: string, init?: RequestInit) => Promise<any>) {
  const [data, setData] = useState<Partial<AdminData>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const load = useCallback(async (forceRefresh = false) => {
    if (!businessUnit) return;

    const cacheKey = `adminData-${businessUnit}`;
    const cached = cache.get(cacheKey);
    const now = Date.now();

    if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      return;
    }

    if (pendingRequests.has(cacheKey)) {
      try {
        const result = await pendingRequests.get(cacheKey)!;
        setData(result);
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

    const fetchPromise = (async () => {
      try {
        // Load data in parallel batches
        const [customers, serviceTypes, employees, workOrders, payrolls] = await Promise.allSettled([
          authedFetch("/api/customers").catch(() => []),
          authedFetch("/api/service-types").catch(() => []),
          authedFetch("/api/employees").catch(() => []),
          authedFetch("/api/work-orders").catch(() => []),
          authedFetch("/api/payroll").catch(() => []),
        ]);

        const result: Partial<AdminData> = {
          customers: customers.status === "fulfilled" ? customers.value : [],
          serviceTypes: serviceTypes.status === "fulfilled" ? serviceTypes.value : [],
          employees: employees.status === "fulfilled" ? employees.value : [],
          workOrders: workOrders.status === "fulfilled" ? (Array.isArray(workOrders.value) ? workOrders.value : workOrders.value?.data || []) : [],
          payrolls: payrolls.status === "fulfilled" ? (Array.isArray(payrolls.value) ? payrolls.value : payrolls.value?.data || []) : [],
        };

        // Load tickets separately (may require feature access)
        try {
          const ticketsRes = await authedFetch("/api/tickets");
          result.tickets = Array.isArray(ticketsRes) ? ticketsRes : ticketsRes?.data || [];
        } catch {
          result.tickets = [];
        }

        // Load other data conditionally
        if (businessUnit === "PrintersUAE") {
          try {
            const [rentalMachines, copierModels] = await Promise.all([
              authedFetch("/api/assets/rental-machines").catch(() => []),
              authedFetch("/api/assets/copier-models").catch(() => []),
            ]);
            result.rentalMachines = Array.isArray(rentalMachines) ? rentalMachines : [];
            result.copierModels = Array.isArray(copierModels) ? copierModels : [];
          } catch {
            result.rentalMachines = [];
            result.copierModels = [];
          }
        }

        cache.set(cacheKey, { data: result, timestamp: now });
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
        setData(result);
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
  }, [businessUnit, authedFetch]);

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
    ...data,
    loading,
    error,
    refresh: () => load(true),
  };
}

