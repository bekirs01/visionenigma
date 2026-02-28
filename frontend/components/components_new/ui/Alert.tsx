import { ReactNode } from "react";

export function Alert({
  children,
  variant = "error",
  onRetry,
  className = "",
}: {
  children: ReactNode;
  variant?: "error" | "info" | "success";
  onRetry?: () => void;
  className?: string;
}) {
  const styles = {
    error: { bg: "bg-red-50", border: "border-red-200", text: "text-red-800", btn: "bg-red-100 hover:bg-red-200 text-red-800", icon: "⚠️" },
    info: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-800", btn: "bg-sky-100 hover:bg-sky-200 text-sky-800", icon: "ℹ️" },
    success: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-800", btn: "bg-emerald-100 hover:bg-emerald-200 text-emerald-800", icon: "✅" },
  };
  const style = styles[variant];

  return (
    <div
      role="alert"
      className={`rounded-card border p-4 ${style.bg} ${style.border} ${style.text} ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 text-lg" aria-hidden>
          {style.icon}
        </span>
        <div className="flex-1 min-w-0">
          {children}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className={`mt-3 inline-flex items-center px-3 py-1.5 rounded-input text-sm font-medium transition-all hover:-translate-y-0.5 ${style.btn}`}
            >
              Повторить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
