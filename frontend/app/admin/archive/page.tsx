"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, Button, Spinner, Alert } from "@/components/ui";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { Ticket, Category } from "@/app/types";

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
  const config: Record<string, { color: string; label: string }> = {
    positive: { color: "bg-green-100 text-green-700", label: "Позитив" },
    neutral: { color: "bg-slate-100 text-slate-600", label: "Нейтраль" },
    negative: { color: "bg-red-100 text-red-700", label: "Негатив" },
  };
  const cfg = config[sentiment] || config.neutral;
  return (
    <span className={`inline-flex px-2 py-px rounded-full text-[10px] font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

export default function AdminArchivePage() {
  const router = useRouter();
  const { t } = useI18n();
  const [isAdmin, setIsAdmin] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.adminCheck().then(() => setIsAdmin(true)).catch(() => router.replace("/admin/login"));
  }, [router]);

  const loadTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTickets({ view: "answered", limit: 200 });
      setTickets(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch {
      setCategories([]);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (isAdmin) loadTickets();
  }, [isAdmin]);

  const categoryName = (id: number | undefined) =>
    categories.find((c) => c.id === id)?.name ?? "—";

  /** AI'ın "Суть проблемы" özeti; 100 karaktere kısalt, yoksa "—". */
  const aiSummaryShort = (t: Ticket) => {
    const raw = t.issue_summary?.trim();
    if (!raw) return "—";
    return raw.length > 100 ? `${raw.slice(0, 100)}…` : raw;
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-3 text-slate-500 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <span className="font-medium">{t("checking")}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000" />
      </div>

      <header className="relative bg-white/70 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Link href="/admin/panel" className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 transition-colors mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                На главную
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center shadow-lg shadow-slate-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-slate-600 to-slate-800 bg-clip-text text-transparent">
                    Архив (ответы отправлены)
                  </h1>
                  <p className="text-sm text-slate-600">Завершённые обращения</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/admin/panel">
                <Button variant="secondary" className="shadow-md">
                  ← Панель
                </Button>
              </Link>
              <Link href="/admin/analytics">
                <Button variant="secondary" className="shadow-md bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                  <span className="text-purple-700">Аналитика</span>
                </Button>
              </Link>
              <Button variant="secondary" onClick={loadTickets} disabled={loading} className="shadow-md">
                {loading ? (
                  <><span className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Обновить</>
                ) : (
                  <>Обновить</>
                )}
              </Button>
              <Button variant="primary" onClick={() => { api.adminLogout(); router.replace("/"); }} className="shadow-lg" style={{ backgroundColor: "#059669", borderColor: "#059669" }}>
                {t("logout")}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <Alert variant="error" className="mb-6" onRetry={loadTickets}>
            {error}
          </Alert>
        )}

        <Card className="overflow-hidden bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-md rounded-2xl">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-4 text-slate-500">
              <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              <span className="font-medium">{t("loading")}</span>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-700">Нет завершённых обращений</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Дата обращения
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Дата ответа
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      От
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Категория
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Тональность
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[180px]">
                      Суть (AI)
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket, index) => (
                    <tr
                      key={ticket.id}
                      className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}
                    >
                      <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap tabular-nums">
                        {formatDateRu(ticket.created_at)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap tabular-nums">
                        {formatDateRu(ticket.reply_sent_at || ticket.completed_at)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {ticket.sender_full_name || ticket.sender_name || ticket.sender_email || "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {ticket.request_category || categoryName(ticket.category_id) || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <SentimentBadge sentiment={ticket.sentiment} />
                      </td>
                      <td className="py-3 px-4 min-w-[180px] max-w-[280px]">
                        <div className="text-sm text-slate-700 line-clamp-2" title={ticket.issue_summary || undefined}>
                          {aiSummaryShort(ticket)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium text-sm hover:underline"
                        >
                          Открыть
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>

      <style jsx global>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
      `}</style>
    </div>
  );
}
