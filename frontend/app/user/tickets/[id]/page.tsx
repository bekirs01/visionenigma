"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useI18n } from "@/app/i18n/I18nProvider";
import type { Ticket, TicketAttachmentRead } from "@/app/types";

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

export default function UserTicketDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const { t } = useI18n();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [attachments, setAttachments] = useState<TicketAttachmentRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTicket = useCallback(async () => {
    if (!id) return;
    setLoading(true); setError(null);
    const clientToken = getOrCreateClientToken();
    try {
      const data = await api.getTicket(id, clientToken);
      setTicket(data);
    } catch (e) { setError(e instanceof Error ? e.message : t("loadError")); setTicket(null); }
    finally { setLoading(false); }
  }, [id, t]);

  const loadAttachments = useCallback(async () => {
    if (!id) return;
    try {
      const clientToken = getOrCreateClientToken();
      const list = await api.getTicketAttachments(id, clientToken);
      setAttachments(list);
    } catch { setAttachments([]); }
  }, [id]);

  useEffect(() => { loadTicket(); }, [loadTicket]);
  useEffect(() => { if (id) loadAttachments(); }, [id, loadAttachments]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-3 text-slate-500 bg-[#f8fafb]">
        <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <span className="text-sm font-medium">{t("loading")}</span>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafb]">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-4">{error || t("ticketNotFound")}</p>
          <Link href="/user/tickets" className="text-emerald-600 hover:underline text-sm">← Мои обращения</Link>
        </div>
      </div>
    );
  }

  const st = statusBadge(ticket.status);

  return (
    <div className="min-h-screen bg-[#f8fafb] flex flex-col">
      <header className="bg-white border-b border-slate-200/80 shadow-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/user/tickets" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Мои обращения
            </Link>
            <div className="h-6 w-px bg-slate-200 mx-3" />
            <h1 className="text-lg font-bold text-slate-800">Обращение</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 lg:px-8 py-8 space-y-5">
        {/* Main Card */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.03), 0 8px 24px -4px rgba(0,0,0,0.06), inset 0 2px 0 rgba(255,255,255,1)" }}>
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${st.cls}`}>{st.text}</span>
              <span className="text-sm text-slate-400">{ticket.created_at ? new Date(ticket.created_at).toLocaleString("ru") : "—"}</span>
            </div>
          </div>
          <div className="px-6 py-5 space-y-5">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Тема</p>
              <p className="text-lg font-bold text-slate-800">{ticket.subject}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Текст обращения</p>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {ticket.body}
              </div>
            </div>
          </div>
        </div>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.03), 0 8px 24px -4px rgba(0,0,0,0.06), inset 0 2px 0 rgba(255,255,255,1)" }}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              <h3 className="text-sm font-semibold text-slate-700">Вложения</h3>
              <span className="text-xs text-slate-400 ml-auto">{attachments.length} файл{attachments.length > 1 ? (attachments.length < 5 ? "а" : "ов") : ""}</span>
            </div>
            <div className="divide-y divide-slate-100">
              {attachments.map((att) => {
                const url = att.download_url || `/uploads/${att.storage_path}`;
                const isImage = /^image\/(jpeg|jpg|png|webp|gif)$/i.test(att.mime_type);
                return (
                  <div key={att.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      {isImage ? (
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      ) : (
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700 truncate">{att.filename}</p>
                      <p className="text-xs text-slate-400">{att.mime_type}{att.size_bytes != null && ` · ${(att.size_bytes / 1024).toFixed(1)} KB`}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 transition-colors">
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

        {/* Reply (if sent) */}
        {(ticket.reply_sent || ticket.sent_reply) && (
          <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.03), 0 8px 24px -4px rgba(0,0,0,0.06), inset 0 2px 0 rgba(255,255,255,1)" }}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              <h3 className="text-sm font-semibold text-slate-700">Ответ от поддержки</h3>
              {ticket.reply_sent_at && <span className="text-xs text-slate-400 ml-auto">{new Date(ticket.reply_sent_at).toLocaleString("ru")}</span>}
            </div>
            <div className="px-6 py-5">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ticket.sent_reply || ticket.ai_reply || "—"}</pre>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
