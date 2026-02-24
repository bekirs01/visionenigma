import { ReactNode } from "react";

const statusStyles: Record<string, string> = {
  new: "bg-indigo-100 text-indigo-800 border-indigo-200",
  in_progress: "bg-amber-100 text-amber-800 border-amber-200",
  answered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
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
  children: ReactNode;
  type?: "status" | "priority";
  value?: string;
  className?: string;
}) {
  const styles = type === "status" ? statusStyles : priorityStyles;
  const key = (value || String(children)).toLowerCase().replace(" ", "_");
  const style = styles[key] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} ${className}`}
    >
      {children}
    </span>
  );
}
