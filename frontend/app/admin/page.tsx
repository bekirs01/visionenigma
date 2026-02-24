"use client";

import dynamic from "next/dynamic";

const HomePageClient = dynamic(() => import("../HomePageClient"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center gap-2 text-slate-500" style={{ background: "#f1f5f9" }}>
      <span>Yükleniyor…</span>
    </div>
  ),
});

export default function AdminPage() {
  return (
    <HomePageClient
      title="Admin panel"
      backLinkLabel="Ana sayfa"
      backLinkUrl="/"
    />
  );
}
