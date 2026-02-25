"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, Button, Badge, Spinner, Alert } from "@/components/ui";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { Ticket, Category } from "@/app/types";

const CLIENT_TOKEN_KEY = "support_client_token";

function getClientToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CLIENT_TOKEN_KEY);
}

export default function UserTicketsPage() {
  const { t } = useI18n();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const clientToken = getClientToken();
      if (!clientToken) {
        setError(t("noClientToken"));
        setTickets([]);
        return;
      }
      const data = await api.getTickets({ limit: 100 }, clientToken);
      setTickets(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    loadTickets();
  }, [loadTickets, loadCategories]);

  const categoryName = (id: number | undefined) =>
    categories.find((c) => c.id === id)?.name ?? "—";

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 overflow-hidden">
      {/* Декоративные элементы */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000" />
      </div>

      {/* Header */}
      <header className="relative bg-white/70 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t("backToHome")}
            </Link>
            <Link href="/user">
              <Button variant="primary" className="h-10 shadow-lg shadow-indigo-500/30">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("sendNewRequest")}
              </Button>
            </Link>
          </div>
          <div className="mt-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {t("myTickets")}
            </h1>
            <p className="text-sm text-slate-600 mt-1">{t("myTicketsDesc")}</p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <Alert variant="error" className="mb-6" onRetry={loadTickets}>
            {error}
          </Alert>
        )}

        <Card className="overflow-hidden bg-white/90 backdrop-blur-md border-white/50 shadow-xl">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-4 text-slate-500">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              </div>
              <span className="font-medium">{t("loading")}</span>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-lg font-medium text-slate-700 mb-2">{t("noTicketsUser")}</p>
              <p className="text-slate-500 mb-6">Создайте ваше первое обращение прямо сейчас</p>
              <Link href="/user">
                <Button variant="primary" className="shadow-lg shadow-indigo-500/30">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t("sendNewRequest")}
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {t("subject")}
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {t("status")}
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {t("category")}
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {t("priority")}
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {t("createdAt")}
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-slate-600 uppercase tracking-wider w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket, index) => (
                    <tr
                      key={ticket.id}
                      className={`border-b border-slate-100 hover:bg-indigo-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                    >
                      <td className="py-4 px-6 text-sm text-slate-500 font-mono">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-600 font-semibold">
                          {ticket.id}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm font-semibold text-slate-800">{ticket.subject}</div>
                        <div className="text-xs text-slate-500">{ticket.sender_email}</div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge type="status" value={ticket.status} />
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-600">
                        {categoryName(ticket.category_id)}
                      </td>
                      <td className="py-4 px-6">
                        <Badge type="priority" value={ticket.priority} />
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-500">
                        {ticket.created_at
                          ? new Date(ticket.created_at).toLocaleString("ru")
                          : "—"}
                      </td>
                      <td className="py-4 px-6">
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium text-sm hover:underline"
                        >
                          {t("open")}
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
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </div>
  );
}
