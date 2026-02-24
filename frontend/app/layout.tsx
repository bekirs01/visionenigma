import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
