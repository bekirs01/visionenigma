"use client";

import { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function ChartCard({ title, children, className = "" }: ChartCardProps) {
  return (
    <div
      className={`relative rounded-2xl bg-white p-6 transition-all duration-300 hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.1),0_4px_10px_-4px_rgba(0,0,0,0.04)] ${className}`}
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px -2px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)" }}
    >
      <div className="absolute inset-0 rounded-2xl border border-slate-200/80" />
      <div className="relative">
        <h3 className="mb-5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}
