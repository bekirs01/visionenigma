"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Ticket, Category, TicketCreate } from "@/app/types";
import { Card, Button, Badge, Alert, Spinner } from "@/components/ui";
import { useI18n } from "@/app/i18n/I18nProvider";

const CLIENT_TOKEN_KEY = "support_client_token";

function getOrCreateClientToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(CLIENT_TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID?.() ?? `ct-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(CLIENT_TOKEN_KEY, token);
  }
  return token;
}

export default function HomePageClient({
  isAdmin = false,
  title,
  backLinkLabel,
  backLinkUrl = "/",
}: {
  isAdmin?: boolean;
  title?: string;
  backLinkLabel?: string;
  backLinkUrl?: string;
}) {
  const { t } = useI18n();
  const pageTitle = title ?? (isAdmin ? t("adminPanel") : t("appTitle"));
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<TicketCreate>({
    sender_email: "",
    subject: "",
    body: "",
    status: "new",
    priority: "medium",
    source: "manual",
  });
  const [submitting, setSubmitting] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const clientToken = isAdmin ? undefined : getOrCreateClientToken();
      const data = await api.getTickets(
        {
          search: search || undefined,
          status: statusFilter || undefined,
          category_id: categoryFilter ? Number(categoryFilter) : undefined,
          limit: 100,
        },
        clientToken
      );
      setTickets(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, search, statusFilter, categoryFilter]);

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
  }, [loadCategories]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { ...form };
      if (!isAdmin) payload.client_token = getOrCreateClientToken();
      await api.createTicket(payload);
      setForm({ sender_email: "", subject: "", body: "", status: "new", priority: "medium", source: "manual" });
      setFormOpen(false);
      loadTickets();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка создания");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeed = async () => {
    setSeedLoading(true);
    setError(null);
    try {
      await api.seedDemo();
      loadTickets();
      loadCategories();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка seed");
    } finally {
      setSeedLoading(false);
    }
  };

  const exportCsv = async () => {
    setExportLoading(true);
    setError(null);
    try {
      await api.exportCsvDownload({
        search: search || undefined,
        status: statusFilter || undefined,
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSV indirme hatası");
    } finally {
      setExportLoading(false);
    }
  };

  const categoryName = (id: number | undefined) => categories.find((c) => c.id === id)?.name ?? "—";

  const handleRetry = () => {
    setError(null);
    loadTickets();
    loadCategories();
  };

  return (
    <div className="min-h-screen">
      <header className="bg-white/80 backdrop-blur-sm border-b border-black/5 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              {backLinkLabel && backLinkUrl && (
                <Link href={backLinkUrl} className="text-sm text-indigo-600 hover:underline block mb-1">
                  ← {backLinkLabel}
                </Link>
              )}
              <h1 className="text-xl font-semibold text-slate-800 tracking-tight">
                {pageTitle}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {t("newRequest").toLowerCase()}
              </p>
              {!isAdmin && (
                <p className="text-xs text-slate-400 mt-1">
                  <Link href="/user" className="text-indigo-500 hover:underline">{t("sendRequest")}</Link>
                  {" · "}
                  <Link href="/admin" className="text-indigo-500 hover:underline">{t("adminLogin")}</Link>
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={loadTickets}>
                {t("refresh")}
              </Button>
              <Button variant="primary" onClick={() => setFormOpen(!formOpen)}>
                + {t("addRequest")}
              </Button>
              {isAdmin && (
                <>
                  <Button variant="secondary" onClick={exportCsv} disabled={exportLoading}>
                    {exportLoading ? <><Spinner className="w-3.5 h-3.5" /> {t("loading")}</> : t("exportCsv")}
                  </Button>
                  <Button variant="secondary" onClick={handleSeed} disabled={seedLoading}>
                    {seedLoading ? <><Spinner className="w-3.5 h-3.5" /> {t("loading")}</> : t("seedDemo")}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-6">
            <Alert variant="error" onRetry={handleRetry}>
              <p className="font-medium">{error}</p>
              <p className="text-sm mt-1 opacity-90">
                <strong>Backend kapalı.</strong> Açmak için: Terminalde proje klasörüne gidin ve{" "}
                <code className="bg-red-100/80 px-1.5 py-0.5 rounded text-xs">./start.sh</code> çalıştırın
              </p>
            </Alert>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 rounded-input border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-shadow"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-input border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 w-full sm:w-40"
                >
                  <option value="">{t("allStatuses")}</option>
                  <option value="new">{t("statusNew")}</option>
                  <option value="in_progress">{t("statusInProgress")}</option>
                  <option value="answered">{t("statusAnswered")}</option>
                  <option value="closed">{t("statusClosed")}</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 rounded-input border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 w-full sm:w-40"
                >
                  <option value="">{t("allCategories")}</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>
            </Card>

            <Card className="overflow-hidden">
              {loading ? (
                <div className="p-8 flex items-center justify-center gap-2 text-slate-500">
                  <Spinner />
                  <span>{t("loading")}</span>
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  {isAdmin ? t("noTickets") : t("noTicketsUser")}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">ID</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Тема</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Отправитель</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Статус</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Категория</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Приоритет</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Создан</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider w-20"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((ticket) => (
                        <tr
                          key={ticket.id}
                          className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-3 px-4 text-sm text-slate-500 font-mono">{ticket.id}</td>
                          <td className="py-3 px-4 text-sm font-medium text-slate-800">{ticket.subject}</td>
                          <td className="py-3 px-4 text-sm text-slate-600">{ticket.sender_email}</td>
                          <td className="py-3 px-4">
                            <Badge type="status" value={ticket.status}>{ticket.status}</Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">{categoryName(ticket.category_id)}</td>
                          <td className="py-3 px-4">
                            <Badge type="priority" value={ticket.priority}>{ticket.priority}</Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-500">
                            {ticket.created_at ? new Date(ticket.created_at).toLocaleString("ru") : "—"}
                          </td>
                          <td className="py-3 px-4">
                            <Link
                              href={`/tickets/${ticket.id}`}
                              className="text-indigo-600 hover:text-indigo-700 font-medium text-sm hover:underline"
                            >
                              {t("open")}
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          <div className="lg:col-span-1">
            {formOpen && (
              <Card className="p-5 sticky top-24">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">{t("newRequest")}</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="form-group">
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t("emailSender")}</label>
                    <input
                      type="email"
                      required
                      value={form.sender_email}
                      onChange={(e) => setForm((f) => ({ ...f, sender_email: e.target.value }))}
                      className="w-full px-3 py-2 rounded-input border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                    />
                  </div>
                  <div className="form-group">
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t("subject")}</label>
                    <input
                      required
                      value={form.subject}
                      onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                      className="w-full px-3 py-2 rounded-input border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                    />
                  </div>
                  <div className="form-group">
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t("text")}</label>
                    <textarea
                      required
                      rows={3}
                      value={form.body}
                      onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                      className="w-full px-3 py-2 rounded-input border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-y"
                    />
                  </div>
                  <div className="form-group">
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t("priority")}</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                      className="w-full px-3 py-2 rounded-input border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                    >
                      <option value="low">{t("priorityLow")}</option>
                      <option value="medium">{t("priorityMedium")}</option>
                      <option value="high">{t("priorityHigh")}</option>
                    </select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button type="submit" variant="primary" disabled={submitting}>
                      {submitting ? <><Spinner className="w-3.5 h-3.5" /> {t("saving")}</> : t("create")}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
                      {t("cancel")}
                    </Button>
                  </div>
                </form>
              </Card>
            )}
            {!formOpen && (
              <Card className="p-5 border-dashed border-2 border-slate-200 bg-slate-50/50">
                <p className="text-sm text-slate-500 mb-3">+ {t("addRequest")}</p>
                <Button variant="primary" onClick={() => setFormOpen(true)}>
                  + {t("addRequest")}
                </Button>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
