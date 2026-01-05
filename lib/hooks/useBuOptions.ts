import { useEffect, useState, useCallback } from "react";
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

export function useBuOptions(businessUnit: BusinessUnit) {
  const [data, setData] = useState<OptionsResponse>({
    customers: [],
    serviceTypes: [],
    employees: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/options?bu=${businessUnit}`, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load options");
      }
      const json = (await res.json()) as OptionsResponse;
      setData(json);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [businessUnit]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    ...data,
    loading,
    error,
    refresh: load,
  };
}

