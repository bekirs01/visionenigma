"use client";

import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";

export default function HomePage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-[#f8fafb] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200/80 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 lg:px-8">
          <div className="flex items-center h-16">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center"
                style={{ boxShadow: "0 4px 12px -2px rgba(16,185,129,0.4)" }}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-slate-800">{t("appTitle")}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 lg:px-8 py-20">
        <div className="w-full max-w-4xl">
          {/* Title */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Система технической поддержки
            </div>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
              Добро пожаловать
            </h2>
            <p className="text-lg text-slate-500 max-w-lg mx-auto">
              Выберите, как вы хотите продолжить
            </p>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* User Card */}
            <Link href="/user" className="group">
              <div
                className="relative bg-white rounded-3xl p-8 h-full transition-all duration-300 hover:-translate-y-2 cursor-pointer overflow-hidden"
                style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.03), 0 8px 24px -4px rgba(0,0,0,0.06), inset 0 2px 0 rgba(255,255,255,1)" }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 0 1px rgba(16,185,129,0.15), 0 4px 8px rgba(16,185,129,0.08), 0 24px 48px -8px rgba(16,185,129,0.18), inset 0 2px 0 rgba(255,255,255,1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.03), 0 8px 24px -4px rgba(0,0,0,0.06), inset 0 2px 0 rgba(255,255,255,1)"; }}
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-500 rounded-t-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="text-center">
                  <div
                    className="w-18 h-18 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                    style={{ width: 72, height: 72, boxShadow: "0 8px 24px -4px rgba(16,185,129,0.35)" }}
                  >
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-emerald-700 transition-colors">
                    {t("iAmUser")}
                  </h3>
                  <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                    {t("userRoleDesc")}
                  </p>
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-semibold group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 border border-emerald-200/60 group-hover:border-emerald-600 group-hover:shadow-lg group-hover:shadow-emerald-500/25">
                    {t("sendRequest")}
                    <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>

            {/* Admin Card */}
            <Link href="/admin/login" className="group">
              <div
                className="relative bg-white rounded-3xl p-8 h-full transition-all duration-300 hover:-translate-y-2 cursor-pointer overflow-hidden"
                style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.03), 0 8px 24px -4px rgba(0,0,0,0.06), inset 0 2px 0 rgba(255,255,255,1)" }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 0 1px rgba(99,102,241,0.15), 0 4px 8px rgba(99,102,241,0.08), 0 24px 48px -8px rgba(99,102,241,0.18), inset 0 2px 0 rgba(255,255,255,1)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.03), 0 8px 24px -4px rgba(0,0,0,0.06), inset 0 2px 0 rgba(255,255,255,1)"; }}
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 via-indigo-500 to-violet-500 rounded-t-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="text-center">
                  <div
                    className="w-18 h-18 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                    style={{ width: 72, height: 72, boxShadow: "0 8px 24px -4px rgba(99,102,241,0.35)" }}
                  >
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-700 transition-colors">
                    {t("iAmAdmin")}
                  </h3>
                  <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                    {t("adminRoleDesc")}
                  </p>
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-semibold group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 border border-indigo-200/60 group-hover:border-indigo-600 group-hover:shadow-lg group-hover:shadow-indigo-500/25">
                    {t("adminLogin")}
                    <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200/60 bg-white/50">
        <div className="max-w-5xl mx-auto px-6 text-center text-xs text-slate-400">
          © 2026 VisionEnigma Support. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
