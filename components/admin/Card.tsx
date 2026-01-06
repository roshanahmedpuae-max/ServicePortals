import React from "react";

interface CardProps {
  title: string;
  children: React.ReactNode;
  accent?: string;
  action?: React.ReactNode;
  className?: string;
}

export const Card = React.memo(({
  title,
  children,
  accent,
  action,
  className,
}: CardProps) => (
  <div className={`group bg-white/80 border border-slate-200/70 rounded-2xl shadow-lg p-5 md:p-6 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl ${className ?? ""}`}>
    <div className="flex items-center justify-between gap-2 mb-4">
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-8 rounded-full ${accent ?? "bg-indigo-500"} shadow-inner transition-all duration-300 group-hover:h-10`}
        />
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      </div>
      {action}
    </div>
    {children}
  </div>
));

Card.displayName = "Card";

