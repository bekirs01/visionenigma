"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Ticket, Category, TicketUpdate, AnalyzeResponse, SuggestReplyResponse } from "@/app/types";
import { Card, Button, Badge, Spinner } from "@/components/ui";
import { useI18n } from "@/app/i18n/I18nProvider";

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [adminOk, setAdminOk] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateForm, setUpdateForm] = useState<TicketUpdate>({});
  const [saving, setSaving] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);
  const [suggestResult, setSuggestResult] = useState<SuggestReplyResponse | null>(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [sendReplyLoading, setSendReplyLoading] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    api
      .adminCheck()
      .then(() => setAdminOk(true))
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  const loadTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTicket(id);
      setTicket(data);
      setUpdateForm({ status: data.status, priority: data.priority, category_id: data.category_id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка загрузки");
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

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
    if (adminOk) loadTicket();
  }, [adminOk, loadTicket]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateTicket(id, updateForm);
      setTicket(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleAnalyze = async () => {
    if (!id) return;
    setAnalyzeLoading(true);
    setAnalyzeResult(null);
    setError(null);
    try {
      const res = await api.analyzeTicket(id);
      setAnalyzeResult(res);
      loadTicket();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка анализа");
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const handleSuggestReply = async () => {
    if (!id) return;
    setSuggestLoading(true);
    setSuggestResult(null);
    setError(null);
    try {
      const res = await api.suggestReply(id);
      setSuggestResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка подсказки ответа");
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleAiAnalyze = async () => {
    if (!id) return;
    setAnalyzeLoading(true);
    setError(null);
    try {
      await api.aiAnalyze(id);
      await loadTicket();
      setShowSendConfirm(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI analiz hatası");
    } finally {
      setAnalyzeLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!id || !ticket?.ai_reply) return;
    setSendReplyLoading(true);
    setError(null);
    try {
      await api.aiSendReply(id, ticket.ai_reply);
      await loadTicket();
      setShowSendConfirm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gönderim hatası");
    } finally {
      setSendReplyLoading(false);
    }
  };

  const categoryName = (cid: number | undefined) => categories.find((c) => c.id === cid)?.name ?? "—";

  if (!adminOk) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-slate-500" style={{ background: "#f1f5f9" }}>
        <span>Проверка доступа…</span>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-slate-500">
        <Spinner />
        <span>Загрузка…</span>
      </div>
    );
  }
  if (!ticket) {
    return (
      <div className="min-h-screen max-w-2xl mx-auto px-4 py-8">
        <p className="text-red-600 font-medium">{error || "Обращение не найдено"}</p>
        <Link href="/" className="inline-block mt-4 text-indigo-600 hover:underline">← К списку</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white/80 backdrop-blur-sm border-b border-black/5 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium hover:underline">
              ← {t("backToList")}
            </Link>
            <Link href="/admin" className="text-slate-500 hover:text-slate-700 text-sm font-medium hover:underline">
              {t("adminPanel")}
            </Link>
          </div>
          <h1 className="text-xl font-semibold text-slate-800 mt-2">{t("ticketDetail")} #{ticket.id}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <Card className="p-5">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-slate-500 font-medium">{t("subject")}</dt>
              <dd className="text-slate-800 font-medium mt-0.5">{ticket.subject}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">{t("from")}</dt>
              <dd className="text-slate-800 mt-0.5">{ticket.sender_email}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500 font-medium">{t("text")}</dt>
              <dd className="mt-1 p-3 rounded-lg bg-slate-50 text-slate-800 whitespace-pre-wrap border border-slate-100">{ticket.body}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">{t("status")}</dt>
              <dd className="mt-0.5"><Badge type="status" value={ticket.status}>{ticket.status}</Badge></dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">{t("priority")}</dt>
              <dd className="mt-0.5"><Badge type="priority" value={ticket.priority}>{ticket.priority}</Badge></dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">{t("category")}</dt>
              <dd className="text-slate-800 mt-0.5">{categoryName(ticket.category_id)}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-medium">{t("createdAt")}</dt>
              <dd className="text-slate-800 mt-0.5">{ticket.created_at ? new Date(ticket.created_at).toLocaleString("ru") : "—"}</dd>
            </div>
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">{t("changeStatusCategory")}</h2>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="form-group">
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("status")}</label>
              <select
                value={updateForm.status ?? ticket.status}
                onChange={(e) => setUpdateForm((f) => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                <option value="new">{t("statusNew")}</option>
                <option value="in_progress">{t("statusInProgress")}</option>
                <option value="answered">{t("statusAnswered")}</option>
                <option value="closed">{t("statusClosed")}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("priority")}</label>
              <select
                value={updateForm.priority ?? ticket.priority}
                onChange={(e) => setUpdateForm((f) => ({ ...f, priority: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                <option value="low">{t("priorityLow")}</option>
                <option value="medium">{t("priorityMedium")}</option>
                <option value="high">{t("priorityHigh")}</option>
              </select>
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("category")}</label>
              <select
                value={updateForm.category_id ?? ticket.category_id ?? ""}
                onChange={(e) => setUpdateForm((f) => ({ ...f, category_id: e.target.value ? Number(e.target.value) : undefined }))}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? <><Spinner className="w-3.5 h-3.5" /> {t("saving")}</> : t("save")}
            </Button>
          </form>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">AI (OpenAI)</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="primary" onClick={handleAiAnalyze} disabled={analyzeLoading}>
              {analyzeLoading ? <><Spinner className="w-3.5 h-3.5" /> {t("aiAnalyzing")}</> : t("aiAnalyze")}
            </Button>
          </div>
          {(ticket.ai_category || ticket.ai_reply) && (
            <div className="mt-4 space-y-3">
              {ticket.ai_category && (
                <p className="text-sm text-slate-700"><span className="font-medium">{t("suggestedCategory")}:</span> {ticket.ai_category}</p>
              )}
              {ticket.ai_reply && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <p className="text-sm font-medium text-slate-800 mb-2">{t("suggestedReply")}:</p>
                  <pre className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.ai_reply}</pre>
                </div>
              )}
              {ticket.ai_reply && showSendConfirm && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm font-medium text-slate-800 mb-2">{t("sendThisReply")}</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="primary" onClick={handleSendReply} disabled={sendReplyLoading}>
                      {sendReplyLoading ? <><Spinner className="w-3.5 h-3.5" /> {t("sending")}</> : t("sendReply")}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setShowSendConfirm(false)}>
                      {t("cancel")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          {(ticket.reply_sent || ticket.sent_reply) && (
            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <p className="text-sm font-medium text-slate-800 mb-1">{t("replySent")}</p>
              <pre className="text-sm text-slate-700 whitespace-pre-wrap">{ticket.sent_reply || ticket.ai_reply || "—"}</pre>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">ИИ (mock)</h2>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={handleAnalyze} disabled={analyzeLoading}>
              {analyzeLoading ? <><Spinner className="w-3.5 h-3.5" /> {t("analyzing")}</> : t("mockAnalyze")}
            </Button>
            <Button type="button" variant="secondary" onClick={handleSuggestReply} disabled={suggestLoading}>
              {suggestLoading ? <><Spinner className="w-3.5 h-3.5" /> {t("generating")}</> : t("mockSuggestReply")}
            </Button>
          </div>
          {analyzeResult && (
            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-sm font-medium text-slate-800">Предложенная категория: {analyzeResult.predicted_category} (уверенность: {analyzeResult.confidence})</p>
              <p className="text-xs text-slate-500 mt-1">provider: {analyzeResult.provider}</p>
            </div>
          )}
          {suggestResult && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <p className="text-sm font-medium text-slate-800 mb-2">Предложенный ответ:</p>
              <pre className="text-sm text-slate-700 whitespace-pre-wrap">{suggestResult.suggested_reply}</pre>
              <p className="text-xs text-slate-500 mt-2">provider: {suggestResult.provider}</p>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
