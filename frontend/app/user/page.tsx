"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, Button, Spinner } from "@/components/ui";
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

export default function UserPanelPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createTicket({
        sender_email: email,
        subject,
        body: message,
        status: "new",
        priority,
        source: "manual",
        client_token: getOrCreateClientToken(),
      });
      setSent(true);
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gönderilemedi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="bg-white/80 backdrop-blur-sm border-b border-black/5 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <h1 className="text-xl font-semibold text-slate-800">{t("sendRequest")}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{t("userFormTitle")}</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {sent && (
          <div className="mb-6 rounded-card border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm">
            {t("requestReceived")}
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-card border border-red-200 bg-red-50 text-red-800 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <Card className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("userFormEmail")}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-input border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                placeholder="example@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("userFormSubject")}</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-input border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                placeholder=""
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("userFormMessage")}</label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-input border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-y"
                placeholder={t("userFormPlaceholder")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t("priority")}</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                className="w-full px-3 py-2 rounded-input border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                <option value="low">{t("priorityLow")}</option>
                <option value="medium">{t("priorityMedium")}</option>
                <option value="high">{t("priorityHigh")}</option>
              </select>
            </div>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? <><Spinner className="w-3.5 h-3.5" /> {t("sending")}</> : t("submitRequest")}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="text-indigo-600 hover:underline">{t("backToHome")}</Link>
        </p>
      </main>
    </div>
  );
}
