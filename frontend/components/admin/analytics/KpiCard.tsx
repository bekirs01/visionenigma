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
      className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 backdrop-blur-md p-5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.02)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.03)] focus-within:ring-2 focus-within:ring-violet-400/30"
      style={{ minHeight: "120px" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-800 sm:text-3xl">{value}</p>
          {subtitle != null && subtitle !== "" && (
            <p className="mt-1 text-xs text-slate-400">{subtitle}</p>
          )}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accentClass} transition-transform duration-300 group-hover:scale-105`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
