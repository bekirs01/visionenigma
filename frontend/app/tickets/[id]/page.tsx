"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Ticket, Category, TicketAttachmentRead } from "@/app/types";
import { Button } from "@/components/ui";
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
  const [attachments, setAttachments] = useState<TicketAttachmentRead[]>([]);
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

  const loadAttachments = useCallback(async () => {
    if (!id) return;
    try {
      const clientToken = typeof window !== "undefined" ? localStorage.getItem("support_client_token") : null;
      const list = await api.getTicketAttachments(id, clientToken ?? undefined);
      setAttachments(list);
    } catch {
      setAttachments([]);
    }
  }, [id]);

  useEffect(() => {
    if (adminOk && id) loadAttachments();
  }, [adminOk, id, loadAttachments]);

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

  const sentimentLabel = (s?: string) => {
    if (s === "positive") return { text: "Позитивная", color: "bg-green-50 text-green-700 border-green-200" };
    if (s === "negative") return { text: "Негативная", color: "bg-red-50 text-red-700 border-red-200" };
    return { text: "Нейтральная", color: "bg-slate-50 text-slate-600 border-slate-200" };
  };

  const statusLabel = (s: string) => {
    if (s === "completed") return { text: "Завершён", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    if (s === "in_progress") return { text: "В работе", color: "bg-blue-50 text-blue-700 border-blue-200" };
    return { text: "Не завершён", color: "bg-amber-50 text-amber-700 border-amber-200" };
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

  const st = statusLabel(ticket.status);
  const sn = sentimentLabel(ticket.sentiment);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/panel"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {t("backToList")}
              </Link>
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h1 className="text-lg font-bold text-slate-800">Обращение</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${st.color}`}>
                {st.text}
              </span>
              <span className="text-sm text-slate-400">
                {ticket.created_at ? new Date(ticket.created_at).toLocaleString("ru") : "—"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sol kolon - Ana icerik */}
          <div className="lg:col-span-2 space-y-6">
            {/* Baslik ve mesaj */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">{ticket.subject}</h2>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{ticket.sender_email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {ticket.priority && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
                        ticket.priority === "high" ? "bg-red-50 text-red-700 border-red-200" :
                        ticket.priority === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-slate-50 text-slate-600 border-slate-200"
                      }`}>{ticket.priority}</span>
                    )}
                    {Boolean(ticket.operator_required) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                        Требуется оператор
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ticket.body}</p>
              </div>
            </div>

            {/* Ekler */}
            {attachments.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                  <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <h3 className="text-base font-semibold text-slate-800">Вложения</h3>
                  <span className="ml-auto text-xs text-slate-400">{attachments.length} файл{attachments.length > 1 ? (attachments.length < 5 ? "а" : "ов") : ""}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {attachments.map((att) => {
                    const url = att.download_url || `/uploads/${att.storage_path}`;
                    const isImage = /^image\/(jpeg|jpg|png|webp|gif)$/i.test(att.mime_type);
                    return (
                      <div key={att.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                          {isImage ? (
                            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          ) : (
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700 truncate">{att.filename}</p>
                          <p className="text-xs text-slate-400">
                            {att.mime_type}{att.size_bytes != null && ` · ${(att.size_bytes / 1024).toFixed(1)} KB`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            Открыть
                          </a>
                          <a href={url} download={att.filename} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200/60 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Скачать
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Yanit */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-slate-800">Ответ AI-агента</h3>
              </div>
              <div className="px-6 py-5">
                {ticket.ai_status === "failed" && (
                  <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-sm font-semibold text-red-800">AI анализ не выполнен</p>
                    <p className="text-sm text-red-700 mt-1">{ticket.ai_error || "Ошибка при разборе вложений или вызове модели."}</p>
                  </div>
                )}

                {ticket.ai_status === "pending" && !ticket.ai_reply && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    AI анализ выполняется… Обновите страницу через несколько секунд.
                  </div>
                )}

                {ticket.ai_reply ? (
                  <div className="space-y-4">
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-amber-700">Редактирование ответа:</p>
                          <span className="text-xs text-slate-400">Вы можете изменить текст перед отправкой</span>
                        </div>
                        <textarea
                          value={editedReply}
                          onChange={(e) => setEditedReply(e.target.value)}
                          className="w-full h-64 p-4 rounded-xl bg-white border-2 border-amber-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-slate-800 text-sm leading-relaxed resize-y outline-none transition-all"
                          placeholder="Введите ответ..."
                        />
                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleSendReply}
                            disabled={sendReplyLoading || !editedReply.trim()}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                          >
                            {sendReplyLoading ? (
                              <><div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" /> Отправка...</>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                Отправить ответ
                              </>
                            )}
                          </button>
                          <button onClick={handleCancelEditing} disabled={sendReplyLoading} className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50/80 to-teal-50/80 border border-emerald-100">
                          <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ticket.ai_reply}</pre>
                        </div>

                        {!ticket.reply_sent && (
                          <div className="flex items-center gap-3 pt-1">
                            <button
                              onClick={handleSendReply}
                              disabled={sendReplyLoading}
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
                            >
                              {sendReplyLoading ? (
                                <><div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" /> Отправка...</>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                  Отправить ответ клиенту
                                </>
                              )}
                            </button>
                            <button
                              onClick={handleStartEditing}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              Редактировать
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <p className="text-slate-500 text-sm">AI-анализ выполняется автоматически при создании тикета...</p>
                  </div>
                )}

                {(ticket.reply_sent || ticket.sent_reply) && (
                  <div className="mt-5 p-5 rounded-xl bg-emerald-50/50 border border-emerald-200">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm font-semibold text-emerald-800">Ответ отправлен</p>
                      {ticket.reply_sent_at && (
                        <span className="text-xs text-slate-500 ml-auto">{new Date(ticket.reply_sent_at).toLocaleString("ru")}</span>
                      )}
                    </div>
                    <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ticket.sent_reply || ticket.ai_reply || "—"}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sag kolon - Detaylar */}
          <div className="space-y-6">
            {/* Ilgili kisi bilgileri */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Контактные данные</h3>
              </div>
              <div className="px-5 py-4 space-y-4">
                {ticket.sender_full_name && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">ФИО</p>
                    <p className="text-sm font-medium text-slate-800">{ticket.sender_full_name}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">E-mail</p>
                  <p className="text-sm font-medium text-slate-800">{ticket.sender_email}</p>
                </div>
                {ticket.sender_phone && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Телефон</p>
                    <p className="text-sm font-medium text-slate-800">{ticket.sender_phone}</p>
                  </div>
                )}
                {ticket.object_name && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Организация</p>
                    <p className="text-sm font-medium text-slate-800">{ticket.object_name}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Cihaz bilgileri */}
            {(ticket.device_type || (ticket.serial_numbers && ticket.serial_numbers.length > 0)) && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">Оборудование</h3>
                </div>
                <div className="px-5 py-4 space-y-4">
                  {ticket.device_type && (
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Тип прибора</p>
                      <p className="text-sm font-medium text-slate-800">{ticket.device_type}</p>
                    </div>
                  )}
                  {ticket.serial_numbers && ticket.serial_numbers.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1.5">Заводские номера</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ticket.serial_numbers.map((snum, i) => (
                          <span key={i} className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-mono border border-slate-200">
                            {snum}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AI analiz sonuclari */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">AI-анализ</h3>
              </div>
              <div className="px-5 py-4 space-y-4">
                {ticket.sentiment && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Тональность</p>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${sn.color}`}>
                      {sn.text}
                    </span>
                  </div>
                )}
                {ticket.request_category && (
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Категория</p>
                    <p className="text-sm font-medium text-slate-800">{ticket.request_category.replace(/_/g, " ")}</p>
                  </div>
                )}
                {Boolean(ticket.operator_required) && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Оператор</p>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      Требуется оператор
                    </span>
                    {ticket.operator_reason && (
                      <p className="text-xs text-slate-500 mt-1.5">{ticket.operator_reason}</p>
                    )}
                  </div>
                )}
                {ticket.issue_summary && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Суть проблемы</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{ticket.issue_summary}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
