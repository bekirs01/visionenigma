import { ReactNode } from "react";

const statusStyles: Record<string, string> = {
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  not_completed: "bg-amber-100 text-amber-800 border-amber-200",
  // legacy support
  new: "bg-amber-100 text-amber-800 border-amber-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  answered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  closed: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

const statusLabels: Record<string, string> = {
  completed: "Завершён",
  not_completed: "Не завершён",
  new: "Не завершён",
  in_progress: "Не завершён",
  answered: "Завершён",
  closed: "Завершён",
};

const priorityStyles: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-sky-100 text-sky-700",
  high: "bg-rose-100 text-rose-700",
};

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
  const key = (value || String(children || "")).toLowerCase().replace(" ", "_");
  const style = styles[key] || "bg-slate-100 text-slate-600 border-slate-200";

  // Для статусов показываем человекочитаемую метку
  const displayText = type === "status" && value
    ? statusLabels[key] || value
    : children || value;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} ${className}`}
    >
      {displayText}
    </span>
  );
}
