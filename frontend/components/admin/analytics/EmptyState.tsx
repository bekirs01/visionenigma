"use client";

export function EmptyState({ message = "Нет данных" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl bg-slate-50/80 border border-slate-200/60">
      <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center mb-3">
        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <p className="text-sm text-slate-500 font-medium">{message}</p>
    </div>
  );
}
