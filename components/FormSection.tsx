"use client";

import { ReactNode } from "react";

interface FormSectionProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function FormSection({
  title,
  subtitle,
  icon,
  children,
  className = "",
}: FormSectionProps) {
  return (
    <div className={`p-4 sm:p-6 border-b border-gray-100 last:border-b-0 ${className}`}>
      <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
        {icon && (
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white shadow-md flex-shrink-0">
            <div className="w-4 h-4 sm:w-5 sm:h-5">
              {icon}
            </div>
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">{title}</h3>
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-500 truncate">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="space-y-3 sm:space-y-4">
        {children}
      </div>
    </div>
  );
}
