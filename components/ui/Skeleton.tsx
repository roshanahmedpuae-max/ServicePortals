import React from "react";

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: boolean;
}

export const Skeleton = React.memo(({ className = "", width, height, rounded = true }: SkeletonProps) => {
  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div
      className={`animate-pulse bg-slate-200 ${rounded ? "rounded" : ""} ${className}`}
      style={style}
    />
  );
});

Skeleton.displayName = "Skeleton";

export const CardSkeleton = React.memo(() => (
  <div className="bg-white/80 border border-slate-200/70 rounded-2xl shadow-lg p-5 md:p-6">
    <div className="flex items-center gap-2 mb-4">
      <Skeleton width="8px" height="32px" className="rounded-full" />
      <Skeleton width="150px" height="24px" />
    </div>
    <div className="space-y-3">
      <Skeleton width="100%" height="20px" />
      <Skeleton width="80%" height="20px" />
      <Skeleton width="90%" height="20px" />
    </div>
  </div>
));

CardSkeleton.displayName = "CardSkeleton";

export const TableSkeleton = React.memo(() => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-sm">
      <thead>
        <tr className="text-left text-slate-500 border-b border-slate-100">
          {[1, 2, 3, 4, 5].map((i) => (
            <th key={i} className="py-2 pr-3">
              <Skeleton width="80px" height="16px" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {[1, 2, 3, 4, 5].map((i) => (
          <tr key={i}>
            {[1, 2, 3, 4, 5].map((j) => (
              <td key={j} className="py-2 pr-3">
                <Skeleton width="100px" height="16px" />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
));

TableSkeleton.displayName = "TableSkeleton";

