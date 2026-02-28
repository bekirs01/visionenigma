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
      className={`rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.02)] transition-all duration-300 hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.08)] ${className}`}
    >
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-600">
        {title}
      </h3>
      {children}
    </div>
  );
}
