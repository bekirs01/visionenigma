import type { Metadata } from "next";
import "./globals.css";
import { I18nProvider } from "./i18n/I18nProvider";
import { LangSwitcher } from "./i18n/LangSwitcher";

export const metadata: Metadata = {
  title: "Support MVP — Оператор",
  description: "Дашборд обработки обращений техподдержки",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="scroll-smooth">
      <body className="antialiased min-h-screen" style={{ background: "#f1f5f9", color: "#0f172a" }}>
        <I18nProvider>
          <div className="sticky top-0 z-20 flex justify-end items-center h-9 px-3 bg-white/90 border-b border-slate-200/80">
            <LangSwitcher />
          </div>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
