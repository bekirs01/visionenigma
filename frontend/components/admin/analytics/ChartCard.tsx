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
      className={`rounded-2xl bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 ${className}`}
      style={{
        border: "1px solid rgba(226,232,240,0.8)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px -2px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08), 0 8px 32px -4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px -2px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)"; }}
    >
      <h3 className="mb-5 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </h3>
      {children}
    </div>
  );
}
