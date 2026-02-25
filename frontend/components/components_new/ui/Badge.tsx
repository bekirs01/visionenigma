import { ReactNode } from "react";

const statusStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  new: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500" },
  in_progress: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  answered: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  closed: { bg: "bg-slate-50", text: "text-slate-600", border: "border-slate-200", dot: "bg-slate-400" },
};

const priorityStyles: Record<string, { bg: string; text: string; dot: string }> = {
  low: { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" },
  medium: { bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500" },
  high: { bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
};

const statusLabels: Record<string, string> = {
  new: "Новый",
  in_progress: "В работе",
  answered: "Отвечен",
  closed: "Закрыт",
  low: "Низкий",
  medium: "Средний",
  high: "Высокий",
};

type StyleType = { bg: string; text: string; dot: string; border?: string };

export function Badge({
  children,
  type = "status",
  value,
  className = "",
}: {
  children?: ReactNode;
  type?: "status" | "priority";
  value?: string;
  className?: string;
}) {
  const styles = type === "status" ? statusStyles : priorityStyles;
  const key = (value || String(children)).toLowerCase().replace(" ", "_");
  const style = (styles as Record<string, StyleType>)[key] || { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" };
  const label = children || statusLabels[key] || value || "—";
  
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${style.bg} ${style.text} ${style.border || ""} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}
