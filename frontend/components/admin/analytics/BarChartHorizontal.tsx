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
    <div className="space-y-3">
      {slice.map((item, idx) => (
        <div key={idx}>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium text-slate-700 truncate mr-2">{item.label}</span>
            <span className="text-slate-500 shrink-0 tabular-nums">
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
