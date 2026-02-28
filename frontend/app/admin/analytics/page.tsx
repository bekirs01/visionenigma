"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button, Alert } from "@/components/ui";
import {
  KpiCard,
  ChartCard,
  EmptyState,
  BarChartHorizontal,
  TimelineArea,
  KpiSkeleton,
  ChartSkeleton,
} from "@/components/admin/analytics";

interface SummaryStats {
  total_tickets: number;
  completed: number;
  not_completed: number;
  operator_required: number;
  avg_response_hours: number | null;
  today_tickets: number;
  week_tickets: number;
}

interface CategoryStat {
  category: string;
  count: number;
  percentage: number;
}

interface SentimentStat {
  sentiment: string;
  count: number;
  percentage: number;
}

interface SourceStat {
  source: string;
  count: number;
  percentage: number;
}

interface TimelineStat {
  date: string;
  count: number;
}

interface OperatorStats {
  total_tickets: number;
  requires_operator: number;
  percentage: number;
  by_reason: Array<{ reason: string; count: number }>;
}

const PERIOD_OPTIONS = [
  { label: "7 дней", days: 7 },
  { label: "30 дней", days: 30 },
  { label: "90 дней", days: 90 },
] as const;

const SENTIMENT_COLORS: Record<string, string> = {
  "Позитивная": "bg-emerald-500",
  "Нейтральная": "bg-slate-400",
  "Негативная": "bg-red-500",
  "Не определено": "bg-slate-300",
};

export default function AnalyticsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState<7 | 30 | 90>(30);

  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [byCategory, setByCategory] = useState<CategoryStat[]>([]);
  const [bySentiment, setBySentiment] = useState<SentimentStat[]>([]);
  const [bySource, setBySource] = useState<SourceStat[]>([]);
  const [timeline, setTimeline] = useState<TimelineStat[]>([]);
  const [operatorStats, setOperatorStats] = useState<OperatorStats | null>(null);

  const timelineFiltered = useMemo(() => {
    if (!timeline.length) return [];
    const n = Math.min(periodDays, timeline.length);
    return timeline.slice(-n);
  }, [timeline, periodDays]);

  useEffect(() => {
    api
      .adminCheck()
      .then(() => setIsAdmin(true))
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, categoryData, sentimentData, sourceData, timelineData, operatorData] =
        await Promise.all([
          api.analyticsGetSummary(),
          api.analyticsGetByCategory(),
          api.analyticsGetBySentiment(),
          api.analyticsGetBySource(),
          api.analyticsGetTimeline(90),
          api.analyticsGetOperatorStats(),
        ]);
      setSummary(summaryData);
      setByCategory(categoryData || []);
      setBySentiment(sentimentData || []);
      setBySource(sourceData || []);
      setTimeline(timelineData || []);
      setOperatorStats(operatorData || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Veriler yüklenemedi");
      setSummary({
        total_tickets: 0,
        completed: 0,
        not_completed: 0,
        operator_required: 0,
        avg_response_hours: null,
        today_tickets: 0,
        week_tickets: 0,
      });
      setByCategory([]);
      setBySentiment([]);
      setBySource([]);
      setTimeline([]);
      setOperatorStats({
        total_tickets: 0,
        requires_operator: 0,
        percentage: 0,
        by_reason: [],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadAnalytics();
  }, [isAdmin]);

  const handleExportCsv = async () => {
    try {
      await api.exportCsvDownload({});
    } catch {
      // ignore
    }
  };

  const handleExportXlsx = async () => {
    try {
      await api.exportXlsxDownload({});
    } catch {
      // ignore
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-gradient-to-br from-slate-50 via-violet-50/30 to-slate-50 text-slate-500">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
        <span className="font-medium">Проверка доступа...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#f8fafc]">
      <header className="sticky top-0 z-10 border-b border-slate-200/90 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-[1440px] px-6 py-5 lg:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                href="/admin/panel"
                className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:text-violet-700 transition-colors mb-1.5"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Назад к тикетам
              </Link>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Аналитика</h1>
              <p className="text-sm text-slate-500 mt-0.5">Статистика обращений</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-xl bg-slate-100/80 p-0.5" role="group" aria-label="Период">
                {PERIOD_OPTIONS.map(({ label, days }) => (
                  <button
                    key={days}
                    onClick={() => setPeriodDays(days)}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:ring-offset-1 ${
                      periodDays === days
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-800"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <Button
                variant="secondary"
                onClick={loadAnalytics}
                disabled={loading}
                className="shrink-0 rounded-xl border-slate-200"
              >
                {loading ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Обновить
                  </>
                )}
              </Button>
              <div className="flex gap-1.5 border-l border-slate-200 pl-3">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-400/40 disabled:opacity-50 transition-colors"
                  title="Экспорт CSV"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0118 19v-4" />
                  </svg>
                  CSV
                </button>
                <button
                  type="button"
                  onClick={handleExportXlsx}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-violet-400/40 disabled:opacity-50 transition-colors"
                  title="Экспорт XLSX"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0118 19v-4" />
                  </svg>
                  XLSX
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1440px] px-6 py-8 lg:px-8">
        {error && (
          <Alert variant="error" className="mb-6" onRetry={loadAnalytics}>
            {error}
          </Alert>
        )}

        {loading ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <KpiSkeleton key={i} />
              ))}
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 mb-8">
              <div className="xl:col-span-8"><ChartSkeleton /></div>
              <div className="xl:col-span-4 space-y-6"><ChartSkeleton /><ChartSkeleton /></div>
            </div>
          </>
        ) : (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
              <KpiCard
                title="Всего тикетов"
                value={summary?.total_tickets ?? 0}
                subtitle={`сегодня: ${summary?.today_tickets ?? 0}`}
                accentClass="bg-slate-100 text-slate-600"
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                }
              />
              <KpiCard
                title="Завершено"
                value={summary?.completed ?? 0}
                subtitle={
                  summary?.total_tickets
                    ? `${Math.round((summary.completed / summary.total_tickets) * 100)}% от всех`
                    : undefined
                }
                accentClass="bg-emerald-100 text-emerald-600"
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                }
              />
              <KpiCard
                title="В работе"
                value={summary?.not_completed ?? 0}
                subtitle="Требуют обработки"
                accentClass="bg-amber-100 text-amber-600"
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <KpiCard
                title="Требуют оператора"
                value={summary?.operator_required ?? 0}
                subtitle={operatorStats ? `${operatorStats.percentage}% от всех` : undefined}
                accentClass="bg-rose-100 text-rose-600"
                icon={
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-12 mb-8">
              <div className="xl:col-span-8">
                <ChartCard title={`Тикеты за период (${periodDays} дн.)`}>
                  {timelineFiltered.length > 0 ? (
                    <TimelineArea data={timelineFiltered} />
                  ) : (
                    <EmptyState message="Нет данных за период" />
                  )}
                </ChartCard>
              </div>
              <div className="xl:col-span-4 space-y-6">
                <ChartCard title="По источнику">
                  {bySource.length > 0 ? (
                    <div className="space-y-2">
                      {bySource.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5"
                        >
                          <span className="text-sm font-medium text-slate-700">{item.source}</span>
                          <span className="shrink-0 rounded-md bg-slate-200/80 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState />
                  )}
                </ChartCard>
                <ChartCard title="По тональности">
                  {bySentiment.length > 0 ? (
                    <div className="space-y-3.5">
                      {bySentiment.map((item, idx) => (
                        <div key={idx}>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-700">{item.sentiment}</span>
                            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600">
                              {item.count} ({item.percentage}%)
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${SENTIMENT_COLORS[item.sentiment] ?? "bg-slate-300"}`}
                              style={{ width: `${Math.max(item.percentage, 2)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptyState />
                  )}
                </ChartCard>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2 mb-8">
              <ChartCard title="По категориям">
                {byCategory.length > 0 ? (
                  <BarChartHorizontal
                    data={byCategory.map((c) => ({ label: c.category, value: c.count, percentage: c.percentage }))}
                    barClass="bg-violet-500"
                    maxItems={8}
                  />
                ) : (
                  <EmptyState />
                )}
              </ChartCard>
              <ChartCard title="Причины эскалации">
                {operatorStats?.by_reason?.length ? (
                  <BarChartHorizontal
                    data={operatorStats.by_reason.slice(0, 6).map((r) => ({
                      label: r.reason,
                      value: r.count,
                      percentage: operatorStats.requires_operator
                        ? Math.round((r.count / operatorStats.requires_operator) * 100)
                        : 0,
                    }))}
                    barClass="bg-amber-500"
                    maxItems={6}
                  />
                ) : (
                  <EmptyState message="Нет эскалаций" />
                )}
              </ChartCard>
            </section>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {summary?.avg_response_hours != null && (
                <ChartCard title="Среднее время ответа" className="sm:col-span-2 xl:col-span-1">
                  <p className="text-2xl font-bold tabular-nums text-violet-600">
                    {summary.avg_response_hours < 1
                      ? `${Math.round(summary.avg_response_hours * 60)} мин`
                      : `${summary.avg_response_hours.toFixed(1)} ч`}
                  </p>
                </ChartCard>
              )}
              <ChartCard title="За эту неделю">
                <p className="text-3xl font-bold tabular-nums text-slate-800">
                  {summary?.week_tickets ?? 0}
                </p>
                <p className="text-sm text-slate-500">обращений</p>
              </ChartCard>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
