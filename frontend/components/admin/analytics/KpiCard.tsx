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
      className="group relative overflow-hidden rounded-2xl bg-white p-5 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        border: "1px solid rgba(226,232,240,0.8)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px -2px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08), 0 8px 32px -4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.9)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px -2px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)"; }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white via-transparent to-slate-50/50 pointer-events-none" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-slate-800">{value}</p>
          {subtitle != null && subtitle !== "" && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accentClass} transition-transform duration-200 group-hover:scale-110`}
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
