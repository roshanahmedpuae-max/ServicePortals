"use client";

import { useEffect, useState } from "react";

export interface IntervalOptions {
  runImmediately?: boolean;
  enabled?: boolean;
}

/**
 * Lightweight helper to standardize interval setup/cleanup.
 * Returns a cleanup function that clears the interval and prevents queued runs.
 */
export function createInterval(
  fn: () => void | Promise<void>,
  ms: number,
  options: IntervalOptions = {}
): () => void {
  const { runImmediately = false, enabled = true } = options;
  if (!enabled || ms <= 0) {
    return () => {};
  }

  let cancelled = false;

  const invoke = () => {
    if (!cancelled) {
      fn();
    }
  };

  if (runImmediately) {
    void invoke();
  }

  const id = setInterval(invoke, ms);

  return () => {
    cancelled = true;
    clearInterval(id);
  };
}

/**
 * Tracks page visibility to optionally pause background polling when the tab is hidden.
 */
export function usePageVisibility(): boolean {
  const getVisibility = () =>
    typeof document === "undefined" ? true : document.visibilityState !== "hidden";

  const [isVisible, setIsVisible] = useState<boolean>(getVisibility);

  useEffect(() => {
    const handleVisibilityChange = () => setIsVisible(getVisibility());
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return isVisible;
}

