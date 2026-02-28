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
      className={`rounded-[18px] border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] ${className}`}
    >
      <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        {title}
      </h3>
      {children}
    </div>
  );
}
