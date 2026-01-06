"use client";

import React, { Suspense } from "react";

interface TabContentProps {
  activeTab: string;
  tabId: string;
  children: React.ReactNode;
}

// Component that only renders children when tab is active
export const TabContent = React.memo(({ activeTab, tabId, children }: TabContentProps) => {
  if (activeTab !== tabId) {
    return null;
  }
  return <>{children}</>;
});

TabContent.displayName = "TabContent";

// Loading fallback for lazy-loaded tabs
export const TabLoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
  </div>
);

