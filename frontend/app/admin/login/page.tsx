"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Card, Button, Spinner } from "@/components/ui";
import { useI18n } from "@/app/i18n/I18nProvider";

export default function AdminLoginPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.adminLogin(code);
      router.replace("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неверный код администратора");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#f1f5f9" }}>
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-xl font-semibold text-slate-800 mb-1">{t("adminLogin")}</h1>
        <p className="text-sm text-slate-500 mb-4">{t("adminCode")}</p>
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t("adminCode")}</label>
            <input
              type="password"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("enterCode")}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
            />
          </div>
          <Button type="submit" variant="primary" disabled={loading} className="w-full">
            {loading ? <><Spinner className="w-3.5 h-3.5" /> {t("checking")}</> : t("login")}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link href="/" className="text-indigo-600 hover:underline">{t("backToHome")}</Link>
        </p>
      </Card>
    </div>
  );
}
