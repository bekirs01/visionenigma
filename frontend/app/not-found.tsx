import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gradient-to-br from-slate-50 to-slate-100">
      <h1 className="text-2xl font-semibold text-slate-800 mb-2">404 — Sayfa bulunamadı</h1>
      <p className="text-slate-500 mb-6">Bu adres mevcut değil. Ana sayfaya dönün.</p>
      <Link
        href="/"
        className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition-colors"
      >
        Ana sayfaya git
      </Link>
    </div>
  );
}
