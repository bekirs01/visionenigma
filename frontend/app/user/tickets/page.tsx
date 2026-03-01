"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { Ticket } from "@/app/types";

const CLIENT_TOKEN_KEY = "client_token";

function getOrCreateClientToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(CLIENT_TOKEN_KEY);
  if (!token) {
    const legacy = localStorage.getItem("support_client_token");
    if (legacy) { token = legacy; localStorage.setItem(CLIENT_TOKEN_KEY, token); }
    if (!token) { token = crypto.randomUUID?.() ?? `ct-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`; localStorage.setItem(CLIENT_TOKEN_KEY, token); }
  }
  return token;
}

const statusBadge = (s: string) => {
  if (s === "completed") return { text: "Завершён", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (s === "in_progress") return { text: "В работе", cls: "bg-blue-50 text-blue-700 border-blue-200" };
  return { text: "Не завершён", cls: "bg-amber-50 text-amber-700 border-amber-200" };
};

export default function UserTicketsPage() {
  const { t } = useI18n();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const clientToken = getOrCreateClientToken();
      const data = await api.getTickets({ limit: 100 }, clientToken);
      setTickets(data?.items ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : t("loadError")); setTickets([]); }
    finally { setLoading(false); }
  }, [t]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  return (
    <div className="min-h-screen bg-[#f8fafb] flex flex-col">
      <header className="bg-white border-b border-slate-200/80 shadow-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              {t("backToHome")}
            </Link>
            <Link href="/user" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all shadow-sm" style={{ boxShadow: "0 4px 12px -2px rgba(16,185,129,0.3)" }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              {t("sendNewRequest")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">{t("myTickets")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t("myTicketsDesc")}</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.03), 0 8px 24px -4px rgba(0,0,0,0.06), inset 0 2px 0 rgba(255,255,255,1)" }}>
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <div className="w-10 h-10 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              <span className="text-sm font-medium">{t("loading")}</span>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <p className="text-base font-medium text-slate-700 mb-1">{t("noTicketsUser")}</p>
              <p className="text-sm text-slate-500 mb-5">Создайте ваше первое обращение</p>
              <Link href="/user" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                {t("sendNewRequest")}
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-12">№</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("subject")}</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("status")}</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">{t("createdAt")}</th>
                    <th className="text-left py-3 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket, index) => {
                    const st = statusBadge(ticket.status);
                    return (
                      <tr key={ticket.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-5 text-sm text-slate-400 tabular-nums">{index + 1}</td>
                        <td className="py-3.5 px-5 text-sm font-medium text-slate-800">{ticket.subject}</td>
                        <td className="py-3.5 px-5"><span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${st.cls}`}>{st.text}</span></td>
                        <td className="py-3.5 px-5 text-sm text-slate-500 whitespace-nowrap">{ticket.created_at ? new Date(ticket.created_at).toLocaleString("ru") : "—"}</td>
                        <td className="py-3.5 px-5">
                          <Link href={`/user/tickets/${ticket.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 transition-colors">
                            Детали
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
      </main>
    </div>
  );
}
