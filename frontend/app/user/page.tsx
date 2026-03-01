"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useI18n } from "@/app/i18n/I18nProvider";

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

function getDeviceInfo(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const kind = mobile ? "mobile" : "desktop";
  const short = ua.slice(0, 80);
  return `${kind}: ${short}`;
}

function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 7 && cleaned.length <= 15;
}

function validateFullName(name: string): boolean {
  const words = name.trim().split(/\s+/);
  return words.length >= 2 && words.every(w => w.length >= 2);
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function UserFormPage() {
  const { t } = useI18n();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [organization, setOrganization] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    message?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    if (!fullName.trim()) newErrors.fullName = "Введите ФИО";
    else if (!validateFullName(fullName)) newErrors.fullName = "Введите имя и фамилию";
    if (!email.trim()) newErrors.email = "Введите email";
    else if (!validateEmail(email)) newErrors.email = "Некорректный email";
    if (!phone.trim()) newErrors.phone = "Введите номер телефона";
    else if (!validatePhone(phone)) newErrors.phone = "Некорректный номер телефона";
    if (!message.trim()) newErrors.message = "Опишите вашу проблему";
    else if (message.trim().length < 10) newErrors.message = "Сообщение слишком короткое (мин. 10 символов)";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (phone === "" && value.length > 0 && !value.startsWith("+")) {
      value = "+7" + value.replace(/^\+7/, "");
    }
    setPhone(value);
    if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
  };

  const handlePhoneFocus = () => {
    if (phone === "") setPhone("+7");
  };

  const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const MAX_FILES = 5;

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (files.length + selected.length > MAX_FILES) { setError(`Максимум ${MAX_FILES} файлов`); return; }
    for (const f of selected) {
      if (f.size > MAX_FILE_SIZE) { setError(`Файл "${f.name}" превышает 10 MB`); return; }
      const ext = f.name.toLowerCase().slice(f.name.lastIndexOf("."));
      if (!ALLOWED_EXTENSIONS.includes(ext)) { setError(`Тип файла "${ext}" не поддерживается`); return; }
    }
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    setError(null);
    try {
      const clientToken = getOrCreateClientToken();
      const ticket = await api.createTicket({
        sender_email: email, sender_name: fullName, subject: `Обращение от ${fullName}`,
        body: message, status: "not_completed", priority: "medium", source: "manual",
        client_token: clientToken, sender_full_name: fullName, sender_phone: phone.replace(/\D/g, ''),
        object_name: organization || undefined, device_info: getDeviceInfo(),
      });
      if (files.length > 0 && ticket?.id) {
        try { await api.uploadTicketAttachments(ticket.id, files, clientToken); }
        catch (uploadErr) { console.error("Attachment upload error:", uploadErr); }
      }
      setSent(true); setFullName(""); setEmail(""); setPhone(""); setMessage(""); setOrganization(""); setFiles([]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("sendError"));
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (hasError?: string) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-slate-800 placeholder:text-slate-400 transition-all outline-none ${
      hasError ? "border-red-300 bg-red-50/50 focus:ring-2 focus:ring-red-500/20 focus:border-red-400" : "border-slate-200 bg-slate-50/50 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white"
    }`;

  return (
    <div className="min-h-screen bg-[#f8fafb] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 shadow-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              {t("backToHome")}
            </Link>
            <Link href="/user/tickets" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors">
              {t("myTickets")}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 lg:px-8 py-10">
        {/* Success */}
        {sent && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 animate-[fadeIn_0.4s_ease-out]">
            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            <span className="text-sm font-medium text-emerald-800">{t("requestReceived")}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            <span className="text-sm font-medium text-red-700 flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        )}

        {/* Form Card */}
        <div
          className="relative bg-white rounded-3xl overflow-hidden"
          style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.03), 0 12px 32px -4px rgba(0,0,0,0.08), inset 0 2px 0 rgba(255,255,255,1)" }}
        >
          {/* Card Header */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-slate-100">
            <div
              className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"
              style={{ boxShadow: "0 8px 24px -4px rgba(16,185,129,0.4)" }}
            >
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">{t("sendRequest")}</h1>
            <p className="text-sm text-slate-500 mt-1">{t("userFormTitle")}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
            {/* FIO */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">ФИО <span className="text-red-400">*</span></label>
              <input type="text" value={fullName} onChange={(e) => { setFullName(e.target.value); if (errors.fullName) setErrors(prev => ({ ...prev, fullName: undefined })); }} placeholder="Иванов Иван Иванович" className={inputClass(errors.fullName)} />
              {errors.fullName && <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email <span className="text-red-400">*</span></label>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors(prev => ({ ...prev, email: undefined })); }} placeholder="example@email.com" className={inputClass(errors.email)} />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Номер телефона <span className="text-red-400">*</span></label>
              <input type="tel" value={phone} onChange={handlePhoneChange} onFocus={handlePhoneFocus} placeholder="+7 (999) 123-45-67" className={inputClass(errors.phone)} />
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Описание проблемы <span className="text-red-400">*</span></label>
              <textarea rows={5} value={message} onChange={(e) => { setMessage(e.target.value); if (errors.message) setErrors(prev => ({ ...prev, message: undefined })); }} placeholder="Подробно опишите вашу проблему или вопрос..." className={`${inputClass(errors.message)} resize-none`} />
              {errors.message && <p className="mt-1 text-xs text-red-500">{errors.message}</p>}
            </div>

            {/* Organization */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Организация <span className="text-xs text-slate-400 font-normal">(необязательно)</span></label>
              <input type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Название предприятия или объекта" className={inputClass()} />
            </div>

            {/* Files */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Прикрепить файлы <span className="text-xs text-slate-400 font-normal">(макс. {MAX_FILES} по 10 MB)</span></label>
              <input type="file" multiple accept={ALLOWED_EXTENSIONS.join(",")} onChange={handleFilesChange} className="hidden" id="file-upload" disabled={files.length >= MAX_FILES} />
              <label
                htmlFor="file-upload"
                className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-dashed transition-all cursor-pointer text-sm font-medium ${
                  files.length >= MAX_FILES ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed" : "border-emerald-200 bg-emerald-50/30 text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Выберите файлы или перетащите сюда
              </label>
              {files.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span className="text-sm text-slate-700 truncate flex-1">{f.name}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all duration-200"
                style={{ boxShadow: "0 4px 14px -2px rgba(16,185,129,0.4)" }}
              >
                {submitting ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{t("sending")}</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>{t("submitRequest")}</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Card */}
        <div
          className="mt-5 relative bg-white rounded-2xl p-5 flex items-start gap-3"
          style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.03), 0 2px 8px -2px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)" }}
        >
          <div className="absolute inset-0 rounded-2xl border border-slate-200/60" />
          <div className="relative flex items-start gap-3">
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
            <div>
              <p className="text-sm font-medium text-slate-700">{t("ticketInfoTitle")}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t("ticketInfoDesc")}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
