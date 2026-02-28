"use client";

export function KpiSkeleton() {
  return (
    <div className="rounded-[18px] border border-slate-200/80 bg-white p-4">
      <div className="h-3 w-20 rounded-md bg-slate-100 animate-pulse" />
      <div className="mt-3 h-8 w-14 rounded-md bg-slate-100 animate-pulse" />
      <div className="mt-2 h-3 w-24 rounded-md bg-slate-50 animate-pulse" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-[18px] border border-slate-200/80 bg-white p-5 animate-pulse">
      <div className="mb-4 h-4 w-36 rounded-md bg-slate-100" />
      <div className="flex h-44 items-end gap-0.5">
        {[40, 65, 35, 80, 50, 70, 45, 60, 55, 75, 40, 65, 50, 70, 45, 60, 55, 65, 50, 70].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-slate-100"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
