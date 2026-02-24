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
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
