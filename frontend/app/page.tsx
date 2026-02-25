"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/app/i18n/I18nProvider";
import { Card, Button } from "@/components/ui";

export default function HomePage() {
  const { t } = useI18n();
  const [selectedRole, setSelectedRole] = useState<"user" | "admin" | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 overflow-hidden">
      {/* Декоративные элементы на фоне */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000" />
      </div>

      {/* Header */}
      <header className="relative bg-white/70 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {t("appTitle")}
                </h1>
                <p className="text-xs text-slate-500">{t("welcomeSubtitle")}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {!selectedRole ? (
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              {t("welcomeSubtitle")}
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Выберите вашу роль, чтобы продолжить работу с системой техподдержки
            </p>
          </div>
        ) : null}

        <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto transition-all duration-500 ${selectedRole ? 'opacity-0 hidden' : 'opacity-100'}`}>
          {/* User Card */}
          <div
            onClick={() => setSelectedRole("user")}
            className="group cursor-pointer"
          >
            <Card className="h-full p-8 bg-white/80 backdrop-blur-sm border-white/50 hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 hover:-translate-y-2">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-indigo-600 transition-colors">
                  {t("iAmUser")}
                </h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  {t("userRoleDesc")}
                </p>
                <div className="flex items-center justify-center gap-2 text-indigo-600 font-semibold group-hover:gap-3 transition-all">
                  <span>{t("sendRequest")}</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </Card>
          </div>

          {/* Admin Card */}
          <div
            onClick={() => setSelectedRole("admin")}
            className="group cursor-pointer"
          >
            <Card className="h-full p-8 bg-white/80 backdrop-blur-sm border-white/50 hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-500/20 transition-all duration-300 hover:-translate-y-2">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-3 group-hover:text-emerald-600 transition-colors">
                  {t("iAmAdmin")}
                </h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                  {t("adminRoleDesc")}
                </p>
                <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold group-hover:gap-3 transition-all">
                  <span>{t("adminLogin")}</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Role Selected - User */}
        {selectedRole === "user" && (
          <div className="max-w-md mx-auto animate-fadeIn">
            <Card className="p-8 bg-white/90 backdrop-blur-md border-white/50 shadow-2xl shadow-indigo-500/20">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">{t("iAmUser")}</h2>
                <p className="text-slate-600 mb-8">{t("userRoleDesc")}</p>
                <div className="space-y-3">
                  <Link href="/user">
                    <Button variant="primary" className="w-full h-12 text-base shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      {t("sendRequest")}
                    </Button>
                  </Link>
                  <Link href="/user/tickets">
                    <Button variant="secondary" className="w-full h-12 text-base">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {t("myTickets")}
                    </Button>
                  </Link>
                </div>
                <button
                  onClick={() => setSelectedRole(null)}
                  className="mt-6 text-sm text-slate-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1 mx-auto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {t("backToSelect")}
                </button>
              </div>
            </Card>
          </div>
        )}

        {/* Role Selected - Admin */}
        {selectedRole === "admin" && (
          <div className="max-w-md mx-auto animate-fadeIn">
            <Card className="p-8 bg-white/90 backdrop-blur-md border-white/50 shadow-2xl shadow-emerald-500/20">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-500/30">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">{t("iAmAdmin")}</h2>
                <p className="text-slate-600 mb-8">{t("adminRoleDesc")}</p>
                <div className="space-y-3">
                  <Link href="/admin/login">
                    <Button variant="primary" className="w-full h-12 text-base shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40" style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      {t("adminLogin")}
                    </Button>
                  </Link>
                </div>
                <button
                  onClick={() => setSelectedRole(null)}
                  className="mt-6 text-sm text-slate-500 hover:text-emerald-600 transition-colors flex items-center justify-center gap-1 mx-auto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  {t("backToSelect")}
                </button>
              </div>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative mt-20 py-8 border-t border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center text-sm text-slate-500">
          <p>© 2026 VisionEnigma Support. All rights reserved.</p>
        </div>
      </footer>

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
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}
