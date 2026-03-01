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
      className="group relative overflow-hidden rounded-2xl bg-white p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-6px_rgba(0,0,0,0.12),0_4px_10px_-4px_rgba(0,0,0,0.06)]"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px -2px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)" }}
    >
      <div className="absolute inset-0 rounded-2xl border border-slate-200/80" />
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-slate-200/40 to-transparent" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-800">{value}</p>
          {subtitle != null && subtitle !== "" && (
            <p className="mt-1.5 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accentClass} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}
          style={{ boxShadow: "0 2px 8px -2px rgba(0,0,0,0.1)" }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
