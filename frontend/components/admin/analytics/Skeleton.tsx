"use client";

export function KpiSkeleton() {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/60 backdrop-blur-md p-5 animate-pulse">
      <div className="h-3 w-20 rounded bg-slate-200" />
      <div className="mt-3 h-8 w-16 rounded bg-slate-200" />
      <div className="mt-2 h-3 w-24 rounded bg-slate-100" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/60 backdrop-blur-md p-5 animate-pulse">
      <div className="mb-4 h-4 w-32 rounded bg-slate-200" />
      <div className="flex h-40 items-end gap-1">
        {[40, 65, 35, 80, 50, 70, 45, 60, 55, 75, 40, 65, 50, 70, 45, 60, 55, 65, 50, 70].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-slate-200"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
