"use client";

import { ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  accentClass: string;
}

export function KpiCard({ title, value, subtitle, icon, accentClass }: KpiCardProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-[18px] border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 hover:scale-[1.01] hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.04)] focus-within:ring-2 focus-within:ring-violet-400/20"
      style={{ minHeight: "100px" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{title}</p>
          <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-slate-800 sm:text-[1.75rem]">{value}</p>
          {subtitle != null && subtitle !== "" && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accentClass} transition-transform duration-200 group-hover:scale-105`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
