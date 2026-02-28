"use client";

interface TimelineStat {
  date: string;
  count: number;
}

export function TimelineArea({ data }: { data: TimelineStat[] }) {
  if (!data || data.length === 0) return null;
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex h-44 items-end gap-0.5">
      {data.map((day, idx) => {
        const height = (day.count / maxCount) * 100;
        return (
          <div
            key={`${day.date}-${idx}`}
            className="group relative flex-1 flex flex-col items-center"
            title={`${day.date}: ${day.count}`}
          >
            <div
              className="w-full min-h-[2px] rounded-t bg-gradient-to-t from-violet-500 to-violet-400/80 transition-all duration-300 hover:from-violet-600 hover:to-violet-500"
              style={{ height: `${Math.max(height, 2)}%` }}
            />
            {idx % 5 === 0 && (
              <span className="mt-1 text-[10px] text-slate-400 -rotate-45 origin-top-left whitespace-nowrap">
                {day.date.slice(5)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
