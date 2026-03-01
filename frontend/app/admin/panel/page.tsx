"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button, Spinner, Alert } from "@/components/ui";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { Ticket, Category } from "@/app/types";

function SentimentBadge({ sentiment }: { sentiment?: string }) {
  if (!sentiment) return <span className="text-slate-400 whitespace-nowrap">—</span>;
  const config = {
    positive: { color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "😊", label: "Позитивная" },
    neutral: { color: "bg-slate-100 text-slate-600 border-slate-200", icon: "😐", label: "Нейтральная" },
    negative: { color: "bg-red-50 text-red-700 border-red-200", icon: "😠", label: "Негативная" },
  };
  const cfg = config[sentiment as keyof typeof config] || config.neutral;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${cfg.color}`}>
      <span>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </span>
  );
}

export default function AdminPanelPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [isAdmin, setIsAdmin] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [requestCategories, setRequestCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortByDate, setSortByDate] = useState<"created_at_desc" | "created_at_asc" | "priority">("created_at_desc");
  const [exportLoading, setExportLoading] = useState(false);
  const [xlsxLoading, setXlsxLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const syncInFlightRef = useRef(false);

  const PAGE_SIZE_OPTIONS = [10, 15, 20, 50] as const;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    api
      .adminCheck()
      .then(() => setIsAdmin(true))
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  const getListParams = () => ({
    search: search || undefined,
    request_category: categoryFilter || undefined,
    sort: sortByDate,
    view: "open" as const,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const loadTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTickets(getListParams());
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

  const refetchTicketsSilent = async () => {
    try {
      const data = await api.getTickets(getListParams());
      setTickets(data?.items ?? []);
      setTotalCount(data?.total ?? 0);
    } catch {}
  };

  const loadCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data);
    } catch {
      setCategories([]);
    }
  };

  const loadRequestCategories = async () => {
    try {
      const res = await api.getTicketRequestCategories({
        search: search || undefined,
        view: "open",
        sort: sortByDate,
      });
      const items = (res?.items || []).map((s) => (s || "").trim()).filter(Boolean);
      // Ensure "другое" exists as fallback option
      if (!items.includes("другое")) items.push("другое");
      setRequestCategories(items);
    } catch {
      // API error: show only "Все категории" + fallback "другое"
      setRequestCategories(["другое"]);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadRequestCategories();
  }, [isAdmin, search, categoryFilter, sortByDate]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, sortByDate, pageSize]);

  useEffect(() => {
    if (isAdmin) {
      loadTickets();
    }
  }, [isAdmin, search, categoryFilter, sortByDate, page, pageSize]);

  useEffect(() => {
    if (syncMessage) {
      const t = setTimeout(() => setSyncMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [syncMessage]);

  // Otomatik yenileme: ilk çalışma 5s sonra, sonra her 15s sync + refetch (mail 10–30 sn içinde tabloda)
  useEffect(() => {
    if (!isAdmin) return;
    const runSyncAndRefetch = async () => {
      if (syncInFlightRef.current) return;
      syncInFlightRef.current = true;
      try {
        await api.syncInbox();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("IMAP") && !msg.includes("не настроен")) setError(msg);
      } finally {
        await refetchTicketsSilent();
        syncInFlightRef.current = false;
      }
    };
    const first = setTimeout(runSyncAndRefetch, 5000);
    const interval = setInterval(runSyncAndRefetch, 15000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [isAdmin, search, categoryFilter, sortByDate]);

  const handleRefresh = async () => {
    setSyncLoading(true);
    setSyncMessage(null);
    setError(null);
    try {
      const res = await api.syncInbox();
      if (res.inserted > 0) {
        setSyncMessage(`${res.inserted} yeni e-posta eklendi`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("IMAP") || msg.includes("не настроен") || msg.includes("не настроен")) {
        // IMAP ayarlı değilse sadece listeyi yenile, hata gösterme
      } else {
        setError(msg);
      }
    } finally {
      await loadTickets();
      setSyncLoading(false);
    }
  };

  const exportCsv = async () => {
    setExportLoading(true);
    try {
      await api.exportCsvDownload({
        search: search || undefined,
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("exportError"));
    } finally {
      setExportLoading(false);
    }
  };

  const exportXlsx = async () => {
    setXlsxLoading(true);
    try {
      await api.exportXlsxDownload({
        search: search || undefined,
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
        view: "open",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("exportError"));
    } finally {
      setXlsxLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.adminLogout();
    router.replace("/");
  };

  const handleDeleteTicket = async (ticketId: number) => {
    if (!confirm(t("confirmDelete") || "Bu talebi silmek istediğinize emin misiniz?")) return;
    try {
      await api.deleteTicket(ticketId);
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
      setTotalCount((c) => Math.max(0, c - 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
    }
  };

  const categoryName = (id: number | undefined) =>
    categories.find((c) => c.id === id)?.name ?? "—";

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
      {/* Декоративные элементы */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000" />
      </div>

      {/* Header — premium toolbar */}
      <header className="relative bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors mb-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                {t("backToHome")}
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-900">{t("adminPanel")}</h1>
                  <p className="text-sm text-slate-500">{t("manageTickets")}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/admin/archive">
                <Button variant="secondary" className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-shadow hover:shadow">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                  <span>Архив</span>
                </Button>
              </Link>
              <Link href="/admin/analytics">
                <Button variant="primary" className="rounded-xl bg-violet-600 hover:bg-violet-700 border-violet-600 text-white shadow-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  <span>Аналитика</span>
                </Button>
              </Link>
              <Button variant="secondary" onClick={handleRefresh} disabled={syncLoading} className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm">
                {syncLoading ? <><span className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> {t("loading")}</> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> {t("refresh")}</>}
              </Button>
              {syncMessage && <span className="text-sm text-emerald-600 font-medium">{syncMessage}</span>}
              <Button variant="secondary" onClick={exportCsv} disabled={exportLoading} className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm">
                {exportLoading ? <><div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> {t("loading")}</> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> CSV</>}
              </Button>
              <Button variant="secondary" onClick={exportXlsx} disabled={xlsxLoading} className="rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 shadow-sm">
                {xlsxLoading ? <><div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> {t("loading")}</> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> XLSX</>}
              </Button>
              <Button variant="primary" onClick={handleLogout} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                {t("logout")}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative max-w-[1440px] mx-auto px-4 sm:px-6 py-5">
        {error && (
          <Alert variant="error" className="mb-6" onRetry={loadTickets}>
            {error}
          </Alert>
        )}

        {/* Filter bar — premium */}
        <div className="max-w-7xl mx-auto mb-4 p-4 rounded-[18px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 focus:bg-white transition-all"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 w-full sm:w-48 focus:bg-white transition-all"
            >
              <option value="">Все категории</option>
              {requestCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={sortByDate}
              onChange={(e) => setSortByDate(e.target.value as "created_at_desc" | "created_at_asc" | "priority")}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-700 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 w-full sm:w-52 focus:bg-white transition-all"
            >
              <option value="created_at_desc">Сначала новые</option>
              <option value="created_at_asc">Сначала старые</option>
              <option value="priority">По приоритету</option>
            </select>
          </div>
        </div>

        {/* Tickets Table — premium */}
        <div className="max-w-7xl mx-auto rounded-[18px] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50 overflow-hidden pt-0">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-4 text-slate-500">
              <div className="w-12 h-12 border-4 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
              <span className="font-medium text-slate-600">{t("loading")}</span>
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-slate-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <p className="text-lg font-medium text-slate-700">{t("noTicketsAdmin")}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto max-h-[70vh] min-w-0">
                <table className="w-full border-collapse" style={{ minWidth: "1420px", tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: 44 }} />
                    <col style={{ width: 220 }} />
                    <col style={{ width: 120 }} />
                    <col style={{ width: 140 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 100 }} />
                    <col style={{ width: 120 }} />
                    <col style={{ width: 200 }} />
                    <col style={{ width: 115 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 185 }} />
                    <col style={{ width: 130 }} />
                    <col style={{ width: 110 }} />
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur border-b border-slate-200">
                    <tr>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap w-0" title="№" style={{ width: 44, minWidth: 44 }}>№</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap min-w-0" title={t("subject")} style={{ width: 220, minWidth: 220 }}>{t("subject")}</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis min-w-0">ФИО</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis min-w-0">Организация</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis min-w-0">Телефон</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis min-w-0">Прибор</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis min-w-0" title="Заводские №">Завод. №</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis min-w-0">Суть вопроса</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap min-w-0">ТОНАЛЬНОСТЬ</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis min-w-0">Категория</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis min-w-0">Оператор</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis min-w-0" title={t("createdAt")}>{t("createdAt")}</th>
                      <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider w-0"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket, index) => {
                      const startRow = (page - 1) * pageSize;
                      return (
                        <tr key={ticket.id} className="group border-b border-slate-100 hover:bg-emerald-50/30 transition-colors">
                          <td className="py-2.5 px-2 text-sm font-medium text-slate-400 tabular-nums align-top w-0" style={{ width: 44, minWidth: 44 }}>{startRow + index + 1}</td>
                          <td className="py-2.5 px-2 align-top min-w-0" style={{ width: 220, minWidth: 220 }}>
                            <div className="text-sm font-medium text-slate-800 break-words" title={ticket.device_info ? `${ticket.subject}\nУстройство: ${ticket.device_info}` : ticket.subject}>{ticket.subject}</div>
                            <div className="text-xs text-slate-500 break-words">{ticket.sender_email}</div>
                          </td>
                          <td className="py-2.5 px-2 text-sm text-slate-700 align-top min-w-0"><span className="break-words">{ticket.sender_full_name || ticket.sender_name || "—"}</span></td>
                          <td className="py-2.5 px-2 text-sm text-slate-600 align-top min-w-0"><span className="break-words">{ticket.object_name || "—"}</span></td>
                          <td className="py-2.5 px-2 text-sm text-slate-600 align-top min-w-0"><span className="break-words">{ticket.sender_phone || "—"}</span></td>
                          <td className="py-2.5 px-2 text-sm text-slate-600 align-top min-w-0"><span className="break-words">{ticket.device_type || "—"}</span></td>
                          <td className="py-2.5 px-2 text-sm text-slate-600 align-top min-w-0">
                            {ticket.serial_numbers?.length ? (
                              <div className="flex flex-wrap gap-1">
                                {ticket.serial_numbers.slice(0, 3).map((sn, i) => (
                                  <span key={i} className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono break-all">{sn}</span>
                                ))}
                                {ticket.serial_numbers.length > 3 && <span className="text-xs text-slate-400">+{ticket.serial_numbers.length - 3}</span>}
                              </div>
                            ) : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="py-2.5 px-2 text-sm text-slate-600 align-top min-w-0"><div className="leading-snug text-slate-700 break-words">{ticket.issue_summary || "—"}</div></td>
                          <td className="py-2.5 px-2 pr-8 align-top min-w-0"><SentimentBadge sentiment={ticket.sentiment} /></td>
                          <td className="py-2.5 pl-6 pr-4 text-sm text-slate-600 align-top min-w-0">
                            <span className="break-words">{(ticket.request_category || "").trim() || "другое"}</span>
                          </td>
                          <td className="py-2.5 pl-5 pr-2 align-top min-w-0">
                            {Boolean(ticket.operator_required) ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80 whitespace-nowrap" title={ticket.operator_reason || "Требуется оператор"}>Требуется оператор</span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200/80 whitespace-nowrap">Оператор не требуется</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 pr-2 text-sm text-slate-500 align-top min-w-0 whitespace-nowrap">{ticket.created_at ? new Date(ticket.created_at).toLocaleString("ru") : "—"}</td>
                          <td className="py-2.5 px-2 align-top">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/tickets/${ticket.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors whitespace-nowrap"
                              >
                                {t("open")}
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDeleteTicket(ticket.id)}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                title={t("delete") || "Удалить"}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-row flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/50 min-w-0">
                <div className="flex items-center gap-2 order-1">
                  <span className="text-sm text-slate-500 whitespace-nowrap">Строк на странице:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1 order-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    {Array.from({ length: Math.min(5, Math.ceil(totalCount / pageSize) || 1) }, (_, i) => {
                      const totalPages = Math.ceil(totalCount / pageSize) || 1;
                      let p: number;
                      if (totalPages <= 5) p = i + 1;
                      else if (page <= 3) p = i + 1;
                      else if (page >= totalPages - 2) p = totalPages - 4 + i;
                      else p = page - 2 + i;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPage(p)}
                          className={`min-w-[2.25rem] h-9 rounded-lg border text-sm font-medium transition-colors ${page === p ? "border-violet-500 bg-violet-500 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                        >
                          {p}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(Math.ceil(totalCount / pageSize) || 1, p + 1))}
                      disabled={page >= Math.ceil(totalCount / pageSize) || totalCount === 0}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
            </>
          )}
        </div>
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
