"use client";

interface BarItem {
  label: string;
  value: number;
  percentage: number;
}

export function BarChartHorizontal({
  data,
  barClass = "bg-violet-500",
  maxItems = 8,
}: {
  data: BarItem[];
  barClass?: string;
  maxItems?: number;
}) {
  if (!data || data.length === 0) return null;
  const slice = data.slice(0, maxItems);
  return (
    <div className="space-y-3.5">
      {slice.map((item, idx) => (
        <div key={idx} className="group">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-medium text-slate-700 truncate min-w-0" title={item.label}>{item.label}</span>
            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600">
              {item.value} ({item.percentage}%)
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barClass}`}
              style={{ width: `${Math.max(item.percentage, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
