"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, Button, Spinner, Alert } from "@/components/ui";
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

// Валидация телефона (минимум 7 цифр для разных форматов)
function validatePhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 7 && cleaned.length <= 15;
}

// Валидация ФИО
function validateFullName(name: string): boolean {
  const words = name.trim().split(/\s+/);
  return words.length >= 2 && words.every(w => w.length >= 2);
}

// Валидация email
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

  // Ошибки валидации
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
    message?: string;
  }>({});

  // Проверка всех полей
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Введите ФИО";
    } else if (!validateFullName(fullName)) {
      newErrors.fullName = "Введите имя и фамилию";
    }

    if (!email.trim()) {
      newErrors.email = "Введите email";
    } else if (!validateEmail(email)) {
      newErrors.email = "Некорректный email";
    }

    if (!phone.trim()) {
      newErrors.phone = "Введите номер телефона";
    } else if (!validatePhone(phone)) {
      newErrors.phone = "Некорректный номер телефона";
    }

    if (!message.trim()) {
      newErrors.message = "Опишите вашу проблему";
    } else if (message.trim().length < 10) {
      newErrors.message = "Сообщение слишком короткое (мин. 10 символов)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Если поле было пустым и вводится первый символ - добавляем +7
    if (phone === "" && value.length > 0 && !value.startsWith("+")) {
      value = "+7" + value.replace(/^\+7/, "");
    }
    setPhone(value);
    if (errors.phone) setErrors(prev => ({ ...prev, phone: undefined }));
  };

  const handlePhoneFocus = () => {
    // При фокусе на пустое поле добавляем +7
    if (phone === "") {
      setPhone("+7");
    }
  };

  const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv"];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const MAX_FILES = 5;

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const total = files.length + selected.length;
    if (total > MAX_FILES) {
      setError(`Максимум ${MAX_FILES} файлов`);
      return;
    }
    for (const f of selected) {
      if (f.size > MAX_FILE_SIZE) {
        setError(`Файл "${f.name}" превышает 10 MB`);
        return;
      }
      const ext = f.name.toLowerCase().slice(f.name.lastIndexOf("."));
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setError(`Тип файла "${ext}" не поддерживается`);
        return;
      }
    }
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);
    try {
      const clientToken = getOrCreateClientToken();
      const ticket = await api.createTicket({
        sender_email: email,
        sender_name: fullName,
        subject: `Обращение от ${fullName}`,
        body: message,
        status: "not_completed",
        priority: "medium",
        source: "manual",
        client_token: clientToken,
        sender_full_name: fullName,
        sender_phone: phone.replace(/\D/g, ''),
        object_name: organization || undefined,
        device_info: getDeviceInfo(),
      });

      if (files.length > 0 && ticket?.id) {
        try {
          await api.uploadTicketAttachments(ticket.id, files, clientToken);
        } catch (uploadErr) {
          console.error("Attachment upload error:", uploadErr);
        }
      }

      setSent(true);
      setFullName("");
      setEmail("");
      setPhone("");
      setMessage("");
      setOrganization("");
      setFiles([]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("sendError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 overflow-hidden">
      {/* Декоративные элементы */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000" />
      </div>

      {/* Header */}
      <header className="relative bg-white/70 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("backToHome")}
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="relative max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {sent && (
          <Alert variant="success" className="mb-6 animate-fadeIn">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">{t("requestReceived")}</span>
            </div>
          </Alert>
        )}

        {error && (
          <Alert variant="error" className="mb-6" onRetry={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Card className="p-8 bg-white/90 backdrop-blur-md border-white/50 shadow-2xl shadow-indigo-500/20">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {t("sendRequest")}
            </h1>
            <p className="text-slate-600 mt-2">{t("userFormTitle")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* ФИО */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  ФИО <span className="text-red-500">*</span>
                </div>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) setErrors(prev => ({ ...prev, fullName: undefined }));
                }}
                placeholder="Иванов Иван Иванович"
                className={`w-full px-4 py-3 rounded-xl border ${errors.fullName ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'} text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all`}
              />
              {errors.fullName && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Email <span className="text-red-500">*</span>
                </div>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                }}
                placeholder="example@email.com"
                className={`w-full px-4 py-3 rounded-xl border ${errors.email ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'} text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all`}
              />
              {errors.email && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Телефон */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Номер телефона <span className="text-red-500">*</span>
                </div>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                onFocus={handlePhoneFocus}
                placeholder="+7 (999) 123-45-67"
                className={`w-full px-4 py-3 rounded-xl border ${errors.phone ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'} text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all`}
              />
              {errors.phone && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Сообщение */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Описание проблемы <span className="text-red-500">*</span>
                </div>
              </label>
              <textarea
                rows={5}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (errors.message) setErrors(prev => ({ ...prev, message: undefined }));
                }}
                placeholder="Подробно опишите вашу проблему или вопрос..."
                className={`w-full px-4 py-3 rounded-xl border ${errors.message ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'} text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all resize-none`}
              />
              {errors.message && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.message}
                </p>
              )}
            </div>

            {/* Организация (необязательное) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Организация <span className="text-slate-400 text-xs">(необязательно)</span>
                </div>
              </label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="Название предприятия или объекта"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Файлы (необязательно) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Прикрепить файлы <span className="text-slate-400 text-xs">(необязательно, макс. {MAX_FILES} файлов по 10 MB)</span>
                </div>
              </label>
              <div className="relative">
                <input
                  type="file"
                  multiple
                  accept={ALLOWED_EXTENSIONS.join(",")}
                  onChange={handleFilesChange}
                  className="hidden"
                  id="file-upload"
                  disabled={files.length >= MAX_FILES}
                />
                <label
                  htmlFor="file-upload"
                  className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                    files.length >= MAX_FILES
                      ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                      : "border-indigo-200 bg-indigo-50/50 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <span className="text-sm font-medium">Выберите файлы или перетащите сюда</span>
                </label>
              </div>
              {files.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {files.map((f, i) => (
                    <li key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-100">
                      <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="text-sm text-slate-700 truncate flex-1">{f.name}</span>
                      <span className="text-xs text-slate-500 flex-shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={submitting}
              className="w-full h-12 text-base shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40"
            >
              {submitting ? (
                <>
                  <Spinner className="w-5 h-5" />
                  {t("sending")}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  {t("submitRequest")}
                </>
              )}
            </Button>
          </form>
        </Card>

        <Card className="mt-6 p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-800">{t("ticketInfoTitle")}</p>
              <p className="text-sm text-indigo-600 mt-1 leading-relaxed">{t("ticketInfoDesc")}</p>
            </div>
          </div>
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
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
