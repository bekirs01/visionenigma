"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card, Badge } from "@/components/ui";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { Ticket } from "@/app/types";

const CLIENT_TOKEN_KEY = "client_token";

function getOrCreateClientToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(CLIENT_TOKEN_KEY);
  if (!token) {
    const legacy = localStorage.getItem("support_client_token");
    if (legacy) {
      token = legacy;
      localStorage.setItem(CLIENT_TOKEN_KEY, token);
    }
    if (!token) {
      token = crypto.randomUUID?.() ?? `ct-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(CLIENT_TOKEN_KEY, token);
    }
  }
  return token;
}

export default function UserTicketDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { t } = useI18n();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const clientToken = getOrCreateClientToken();
    try {
      const data = await api.getTicket(id, clientToken);
      setTicket(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-3 text-slate-500 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <span className="font-medium">{t("loading")}</span>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-4">{error || t("ticketNotFound")}</p>
          <Link href="/user/tickets" className="text-indigo-600 hover:underline">← Мои обращения</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <header className="relative bg-white/70 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <Link href="/user/tickets" className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 transition-colors mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Мои обращения
          </Link>
          <h1 className="text-xl font-bold text-slate-800">Обращение #{ticket.id}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Детали вашего обращения</p>
        </div>
      </header>

      <main className="relative max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Card className="p-6 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <Badge type="status" value={ticket.status} />
            <span className="text-sm text-slate-500">
              {ticket.created_at ? new Date(ticket.created_at).toLocaleString("ru") : "—"}
            </span>
          </div>
          <dl className="space-y-5">
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Тема</dt>
              <dd className="text-lg font-semibold text-slate-800">{ticket.subject}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Текст обращения</dt>
              <dd className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed">
                {ticket.body}
              </dd>
            </div>
          </dl>
        </Card>
      </main>
    </div>
  );
}
