"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, Button, Badge, Spinner, Alert } from "@/components/ui";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { Ticket, Category } from "@/app/types";

// Компонент для отображения тональности (sentiment)
function SentimentBadge({ sentiment }: { sentiment?: string }) {
  if (!sentiment) return <span className="text-slate-400">—</span>;

  const config = {
    positive: { color: "bg-green-100 text-green-700", icon: "😊", label: "Позитив" },
    neutral: { color: "bg-slate-100 text-slate-600", icon: "😐", label: "Нейтраль" },
    negative: { color: "bg-red-100 text-red-700", icon: "😠", label: "Негатив" },
  };

  const cfg = config[sentiment as keyof typeof config] || config.neutral;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-px rounded-full text-[10px] font-medium ${cfg.color}`}>
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [seedLoading, setSeedLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [xlsxLoading, setXlsxLoading] = useState(false);

  // 20 категорий запросов (whitelist, как в backend)
  const requestCategories = [
    { value: "неисправность", label: "Неисправность" },
    { value: "калибровка", label: "Калибровка" },
    { value: "запрос_документации", label: "Запрос документации" },
    { value: "гарантия", label: "Гарантия" },
    { value: "замена_датчика", label: "Замена датчика" },
    { value: "консультация", label: "Консультация" },
    { value: "экзамен", label: "Экзамен / аттестация" },
    { value: "пересдача", label: "Пересдача" },
    { value: "оплата", label: "Оплата / счёт" },
    { value: "договор", label: "Договор" },
    { value: "возврат", label: "Возврат" },
    { value: "жалоба", label: "Жалоба" },
    { value: "срочный_вызов", label: "Срочный вызов" },
    { value: "монтаж", label: "Монтаж / установка" },
    { value: "поставка", label: "Поставка / доставка" },
    { value: "обучение", label: "Обучение" },
    { value: "сертификация", label: "Сертификация" },
    { value: "ремонт", label: "Ремонт" },
    { value: "апгрейд", label: "Апгрейд / модернизация" },
    { value: "другое", label: "Другое" },
  ];

  useEffect(() => {
    api
      .adminCheck()
      .then(() => setIsAdmin(true))
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  const loadTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTickets({
        search: search || undefined,
        status: statusFilter || undefined,
        request_category: categoryFilter || undefined,
        limit: 100,
      });
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
    if (isAdmin) {
      loadTickets();
    }
  }, [isAdmin, search, statusFilter, categoryFilter]);

  const handleSeed = async () => {
    setSeedLoading(true);
    try {
      await api.seedDemo();
      loadTickets();
      loadCategories();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("seedError"));
    } finally {
      setSeedLoading(false);
    }
  };

  const exportCsv = async () => {
    setExportLoading(true);
    try {
      await api.exportCsvDownload({
        search: search || undefined,
        status: statusFilter || undefined,
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
        status: statusFilter || undefined,
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
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

      {/* Header */}
      <header className="relative bg-white/70 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 transition-colors mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t("backToHome")}
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {t("adminPanel")}
                  </h1>
                  <p className="text-sm text-slate-600">{t("manageTickets")}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={loadTickets} className="shadow-md">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t("refresh")}
              </Button>
              <Button variant="secondary" onClick={exportCsv} disabled={exportLoading} className="shadow-md">
                {exportLoading ? (
                  <><div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> {t("loading")}</>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    CSV
                  </>
                )}
              </Button>
              <Button variant="secondary" onClick={exportXlsx} disabled={xlsxLoading} className="shadow-md">
                {xlsxLoading ? (
                  <><div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> {t("loading")}</>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    XLSX
                  </>
                )}
              </Button>
              <Button variant="secondary" onClick={handleSeed} disabled={seedLoading} className="shadow-md">
                {seedLoading ? (
                  <><div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> {t("loading")}</>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    {t("seedDemo")}
                  </>
                )}
              </Button>
              <Button variant="primary" onClick={handleLogout} className="shadow-lg shadow-emerald-500/30" style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t("logout")}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {error && (
          <Alert variant="error" className="mb-6" onRetry={loadTickets}>
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Card className="p-5 mb-6 bg-white/90 backdrop-blur-md border-white/50 shadow-xl">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 w-full sm:w-40"
            >
              <option value="">Все статусы</option>
              <option value="not_completed">Не завершён</option>
              <option value="completed">Завершён</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 w-full sm:w-48"
            >
              <option value="">Все категории</option>
              {requestCategories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </Card>

        {/* Tickets Table */}
        <Card className="overflow-hidden bg-white/90 backdrop-blur-md border border-slate-200/80 shadow-md rounded-2xl">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-4 text-slate-500">
              <div className="relative">
                <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
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
              <p className="text-lg font-medium text-slate-700 mb-2">{t("noTicketsAdmin")}</p>
              <Button variant="primary" onClick={handleSeed} className="shadow-lg shadow-emerald-500/30" style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                {t("seedDemo")}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider w-12">
                      №
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {t("subject")}
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      ФИО
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Организация
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Телефон
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Прибор
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Заводские №
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider max-w-[200px]">
                      Суть вопроса
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Тональность
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Категория
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Оператор
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {t("status")}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {t("createdAt")}
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider w-28"></th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket, index) => (
                    <tr
                      key={ticket.id}
                      className={`border-b border-slate-100 hover:bg-slate-50/80 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}
                    >
                      <td className="py-3 px-4 text-sm text-slate-500 tabular-nums">
                        {ticket.id}
                      </td>
                      <td className="py-3 px-4">
                        <div
                          className="text-sm font-semibold text-slate-800 max-w-[200px] truncate"
                          title={ticket.device_info ? `${ticket.subject}\nУстройство: ${ticket.device_info}` : ticket.subject}
                        >
                          {ticket.subject}
                        </div>
                        <div className="text-xs text-slate-500">{ticket.sender_email}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {ticket.sender_full_name || ticket.sender_name || "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 max-w-[150px] truncate" title={ticket.object_name || ""}>
                        {ticket.object_name || "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {ticket.sender_phone || "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {ticket.device_type || "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {ticket.serial_numbers && ticket.serial_numbers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {ticket.serial_numbers.slice(0, 3).map((sn, i) => (
                              <span key={i} className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-mono">
                                {sn}
                              </span>
                            ))}
                            {ticket.serial_numbers.length > 3 && (
                              <span className="text-xs text-slate-400">+{ticket.serial_numbers.length - 3}</span>
                            )}
                          </div>
                        ) : "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 max-w-[200px]">
                        <div className="truncate" title={ticket.issue_summary || ""}>
                          {ticket.issue_summary || "—"}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <SentimentBadge sentiment={ticket.sentiment} />
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {ticket.request_category || categoryName(ticket.category_id) || "—"}
                      </td>
                      <td className="py-3 px-4">
                        {Boolean(ticket.operator_required) ? (
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 whitespace-nowrap"
                            title={ticket.operator_reason || "Запрос требует вмешательства специалиста."}
                          >
                            Требуется оператор
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-600 border border-slate-100 whitespace-nowrap">
                            Оператор не требуется
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Badge type="status" value={ticket.status} />
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500">
                        {ticket.created_at
                          ? new Date(ticket.created_at).toLocaleDateString("ru")
                          : "—"}
                      </td>
                      <td className="py-3 px-4 flex items-center gap-2">
                        <Link
                          href={`/tickets/${ticket.id}`}
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium text-sm hover:underline"
                        >
                          {t("open")}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDeleteTicket(ticket.id)}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title={t("delete") || "Sil"}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
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
