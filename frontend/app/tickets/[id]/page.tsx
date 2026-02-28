"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Ticket, Category } from "@/app/types";
import { Card, Button, Badge, Alert } from "@/components/ui";
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
  const [sendReplyLoading, setSendReplyLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedReply, setEditedReply] = useState("");
  const { t } = useI18n();

  useEffect(() => {
    api
      .adminCheck()
      .then(() => setAdminOk(true))
      .catch(() => setAdminOk(false));
  }, []);

  const loadTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const clientToken = typeof window !== "undefined" ? localStorage.getItem("support_client_token") : null;
      const data = await api.getTicket(id, clientToken ?? undefined);
      setTicket(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("loadError"));
      setTicket(null);
    } finally {
      setLoading(false);
    }
  }, [id, t]);

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

  // Инициализировать редактируемый ответ при загрузке тикета
  useEffect(() => {
    if (ticket?.ai_reply) {
      setEditedReply(ticket.ai_reply);
    }
  }, [ticket?.ai_reply]);

  const handleSendReply = async () => {
    if (!id || !editedReply.trim()) return;
    setSendReplyLoading(true);
    setError(null);
    try {
      await api.aiSendReply(id, editedReply);
      setIsEditing(false);
      await loadTicket();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("sendError"));
    } finally {
      setSendReplyLoading(false);
    }
  };

  const handleStartEditing = () => {
    setIsEditing(true);
    if (ticket?.ai_reply) {
      setEditedReply(ticket.ai_reply);
    }
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    if (ticket?.ai_reply) {
      setEditedReply(ticket.ai_reply);
    }
  };

  if (!adminOk) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-3 text-slate-500 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <span className="font-medium">{t("checking")}</span>
      </div>
    );
  }
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-3 text-slate-500 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <span className="font-medium">{t("loading")}</span>
      </div>
    );
  }
  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-3 text-slate-500 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
        <div className="text-center">
          <p className="text-red-600 font-medium">{error || t("ticketNotFound")}</p>
          <Link href="/admin/panel" className="inline-block mt-4 text-emerald-600 hover:underline">← {t("backToList")}</Link>
        </div>
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin/panel" className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {t("backToList")}
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-500/30">
                <span className="text-white font-bold text-sm">#{ticket.id}</span>
              </div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                {t("ticketDetail")}
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {error && (
          <Alert variant="error" onRetry={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Ticket Info */}
        <Card className="p-6 bg-white/90 backdrop-blur-md border-white/50 shadow-xl">
          <div className="flex flex-wrap items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <Badge type="status" value={ticket.status} />
            <Badge type="priority" value={ticket.priority} />
            {Boolean(ticket.operator_required) && (
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100 whitespace-nowrap"
                title={ticket.operator_reason || "Запрос требует вмешательства специалиста."}
              >
                Требуется оператор
              </span>
            )}
            <span className="text-sm text-slate-500 ml-auto">
              {ticket.created_at ? new Date(ticket.created_at).toLocaleString("ru") : "—"}
            </span>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{t("subject")}</dt>
              <dd className="text-lg font-semibold text-slate-800">{ticket.subject}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{t("from")}</dt>
              <dd className="flex items-center gap-2 text-slate-700">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {ticket.sender_email}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">{t("text")}</dt>
              <dd className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 text-slate-800 whitespace-pre-wrap border border-slate-200 leading-relaxed">
                {ticket.body}
              </dd>
            </div>
          </dl>
        </Card>

        {/* ЭРИС: Извлечённые данные */}
        {(ticket.sender_full_name || ticket.object_name || ticket.device_type || ticket.sentiment || ticket.request_category) && (
          <Card className="p-6 bg-white/90 backdrop-blur-md border-white/50 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-slate-800">Извлечённые данные (AI)</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ticket.sender_full_name && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">ФИО</p>
                  <p className="text-sm font-medium text-slate-800">{ticket.sender_full_name}</p>
                </div>
              )}
              {ticket.object_name && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Организация</p>
                  <p className="text-sm font-medium text-slate-800">{ticket.object_name}</p>
                </div>
              )}
              {ticket.sender_phone && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Телефон</p>
                  <p className="text-sm font-medium text-slate-800">{ticket.sender_phone}</p>
                </div>
              )}
              {ticket.device_type && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Тип прибора</p>
                  <p className="text-sm font-medium text-slate-800">{ticket.device_type}</p>
                </div>
              )}
              {ticket.serial_numbers && ticket.serial_numbers.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Заводские номера</p>
                  <div className="flex flex-wrap gap-1">
                    {ticket.serial_numbers.map((sn, i) => (
                      <span key={i} className="inline-block px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-mono">
                        {sn}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {ticket.sentiment && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Тональность</p>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    ticket.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                    ticket.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {ticket.sentiment === 'positive' && '😊 Позитивная'}
                    {ticket.sentiment === 'neutral' && '😐 Нейтральная'}
                    {ticket.sentiment === 'negative' && '😠 Негативная'}
                  </span>
                </div>
              )}
              {ticket.request_category && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Категория запроса</p>
                  <p className="text-sm font-medium text-slate-800">{ticket.request_category}</p>
                </div>
              )}
            </div>
            {ticket.issue_summary && (
              <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Суть проблемы</p>
                <p className="text-sm text-blue-700 leading-relaxed">{ticket.issue_summary}</p>
              </div>
            )}
          </Card>
        )}

        {/* AI Ответ */}
        <Card className="p-6 bg-white/90 backdrop-blur-md border-white/50 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800">Ответ AI-агента</h2>
          </div>

          {ticket.ai_reply ? (
            <div className="space-y-4">
              {isEditing ? (
                /* Режим редактирования */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-amber-700">Редактирование ответа:</p>
                    <span className="text-xs text-slate-500">Вы можете изменить текст перед отправкой</span>
                  </div>
                  <textarea
                    value={editedReply}
                    onChange={(e) => setEditedReply(e.target.value)}
                    className="w-full h-64 p-4 rounded-xl bg-white border-2 border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-slate-800 text-sm leading-relaxed resize-y outline-none transition-all"
                    placeholder="Введите ответ..."
                  />
                  <div className="flex items-center gap-3">
                    <Button
                      variant="primary"
                      onClick={handleSendReply}
                      disabled={sendReplyLoading || !editedReply.trim()}
                      className="shadow-lg shadow-emerald-500/30"
                      style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                    >
                      {sendReplyLoading ? (
                        <><div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" /> Отправка...</>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                          Отправить ответ
                        </>
                      )}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleCancelEditing}
                      disabled={sendReplyLoading}
                    >
                      Отмена
                    </Button>
                  </div>
                </div>
              ) : (
                /* Режим просмотра */
                <>
                  <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100">
                    <p className="text-sm font-semibold text-emerald-800 mb-2">Сгенерированный ответ:</p>
                    <pre className="text-sm text-emerald-700 whitespace-pre-wrap leading-relaxed">{ticket.ai_reply}</pre>
                  </div>

                  {!ticket.reply_sent && (
                    <div className="flex items-center gap-3">
                      <Button
                        variant="primary"
                        onClick={handleSendReply}
                        disabled={sendReplyLoading}
                        className="shadow-lg shadow-emerald-500/30"
                        style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                      >
                        {sendReplyLoading ? (
                          <><div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" /> Отправка...</>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Отправить ответ клиенту
                          </>
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleStartEditing}
                        className="border-amber-200 text-amber-700 hover:bg-amber-50"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Редактировать
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <p className="text-slate-500">AI-анализ выполняется автоматически при создании тикета...</p>
            </div>
          )}

          {(ticket.reply_sent || ticket.sent_reply) && (
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-semibold text-slate-800">Ответ отправлен</p>
                {ticket.reply_sent_at && (
                  <span className="text-xs text-slate-500 ml-auto">
                    {new Date(ticket.reply_sent_at).toLocaleString("ru")}
                  </span>
                )}
              </div>
              <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ticket.sent_reply || ticket.ai_reply || "—"}</pre>
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
