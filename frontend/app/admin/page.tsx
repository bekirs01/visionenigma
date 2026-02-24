"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { useI18n } from "@/app/i18n/I18nProvider";

const HomePageClient = dynamic(() => import("../HomePageClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center gap-2 text-slate-500" style={{ background: "#f1f5f9" }}>
      <span>Загрузка…</span>
    </div>
  ),
});

export default function AdminPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [adminOk, setAdminOk] = useState(false);

  useEffect(() => {
    api
      .adminCheck()
      .then(() => setAdminOk(true))
      .catch(() => router.replace("/admin/login"));
  }, [router]);

  if (!adminOk) {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-slate-500" style={{ background: "#f1f5f9" }}>
        <span>{t("checking")}</span>
      </div>
    );
  }
  return (
    <HomePageClient
      isAdmin
      title={t("adminPanel")}
      backLinkLabel={t("backToHome")}
      backLinkUrl="/"
    />
  );
}
