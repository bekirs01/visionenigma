"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button, Alert } from "@/components/ui";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { Ticket } from "@/app/types";

function formatDateRu(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${day}.${month}.${year}, ${h}:${m}`;
}

function SentimentBadge({ sentiment }: { sentiment?: string }) {
  if (!sentiment) return <span className="text-slate-400">—</span>;
  const config: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    positive: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Позитивная" },
    neutral: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400", label: "Нейтральная" },
    negative: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500", label: "Негативная" },
  };
  const cfg = config[sentiment] || config.neutral;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

export default function AdminArchivePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [isAdmin, setIsAdmin] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  const PAGE_SIZE_OPTIONS = [10, 15, 20, 50] as const;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    api.adminCheck().then(() => setIsAdmin(true)).catch(() => router.replace("/admin/login"));
  }, [router]);

  const loadTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTickets({
        view: "answered",
        search: search || undefined,
        sort: sortBy === "oldest" ? "created_at_asc" : "created_at_desc",
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setTickets(data?.items ?? []);
      setTotalCount(data?.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setTickets([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { setPage(1); }, [search, sortBy, pageSize]);
  useEffect(() => { if (isAdmin) loadTickets(); }, [isAdmin, search, sortBy, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-3 text-slate-500 bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/40">
        <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        <span className="font-medium">{t("checking")}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-indigo-50/40">
      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Link href="/admin/panel" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                На главную
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">Архив обращений</h1>
                  <p className="text-sm text-slate-500">Завершённые — ответы отправлены</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/admin/panel">
                <Button variant="secondary" className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                  <span>Панель</span>
                </Button>
              </Link>
              <Link href="/admin/analytics">
                <Button variant="primary" className="rounded-xl bg-violet-600 hover:bg-violet-700 border-violet-600 text-white shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  <span>Аналитика</span>
                </Button>
              </Link>
              <Button variant="secondary" onClick={loadTickets} disabled={loading} className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm">
                {loading ? (
                  <><span className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Загрузка</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Обновить</>
                )}
              </Button>
              <Button variant="primary" onClick={() => { api.adminLogout(); router.replace("/"); }} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative max-w-[1440px] mx-auto px-4 sm:px-6 py-5">
        {error && <Alert variant="error" className="mb-6" onRetry={loadTickets}>{error}</Alert>}

        {/* Filter bar */}
        <div className="mb-4 p-4 rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-sm shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по имени, email, теме..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all outline-none"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "newest" | "oldest")}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-700 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all outline-none cursor-pointer"
            >
              <option value="newest">Сначала новые</option>
              <option value="oldest">Сначала старые</option>
            </select>
          </div>
        </div>

        {/* Stats bar */}
        <div className="mb-4 flex items-center justify-between px-1">
          <p className="text-sm text-slate-500">
            Всего в архиве: <span className="font-semibold text-slate-700">{totalCount}</span> обращений
          </p>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-sm shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-4 text-slate-500">
              <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
              <span className="font-medium">{t("loading")}</span>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center shadow-inner">
                <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-700">Нет завершённых обращений</p>
              <p className="text-sm text-slate-500 mt-1">Ответы появятся здесь после отправки</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/60">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[44px]">№</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Тема</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">От</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Категория</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Тональность</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap min-w-[200px]">Суть (AI)</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Обращение</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">Ответ</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket, index) => {
                    const rowNum = (page - 1) * pageSize + index + 1;
                    const summary = ticket.issue_summary?.trim();
                    const summaryShort = summary ? (summary.length > 90 ? `${summary.slice(0, 90)}...` : summary) : "—";
                    return (
                      <tr
                        key={ticket.id}
                        className="group border-b border-slate-100 hover:bg-violet-50/40 transition-colors"
                      >
                        <td className="py-3 px-4 text-sm font-medium text-slate-400">
                          {rowNum}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-800 font-medium max-w-[200px]">
                          <div className="truncate">{ticket.subject || "—"}</div>
                          <div className="text-xs text-slate-400 mt-0.5 truncate">{ticket.sender_email}</div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                          {ticket.sender_full_name || ticket.sender_name || "—"}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                            {(ticket.request_category || "").trim() || "другое"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <SentimentBadge sentiment={ticket.sentiment} />
                        </td>
                        <td className="py-3 px-4 min-w-[200px] max-w-[280px]">
                          <div className="text-sm text-slate-600 line-clamp-2" title={summary || undefined}>
                            {summaryShort}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500 whitespace-nowrap tabular-nums">
                          {formatDateRu(ticket.created_at)}
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500 whitespace-nowrap tabular-nums">
                          {formatDateRu(ticket.reply_sent_at || ticket.completed_at)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href={`/tickets/${ticket.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors"
                          >
                            Открыть
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && tickets.length > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Строк на странице:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 cursor-pointer outline-none focus:ring-2 focus:ring-violet-500/20"
              >
                {PAGE_SIZE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) { pageNum = i + 1; }
                else if (page <= 3) { pageNum = i + 1; }
                else if (page >= totalPages - 2) { pageNum = totalPages - 4 + i; }
                else { pageNum = page - 2 + i; }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      page === pageNum
                        ? "bg-violet-600 text-white shadow-md shadow-violet-500/25"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
