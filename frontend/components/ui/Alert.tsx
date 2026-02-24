import { ReactNode } from "react";

export function Alert({
  children,
  variant = "error",
  onRetry,
  className = "",
}: {
  children: ReactNode;
  variant?: "error" | "info";
  onRetry?: () => void;
  className?: string;
}) {
  const isError = variant === "error";
  return (
    <div
      role="alert"
      className={`rounded-card border p-4 ${isError ? "bg-red-50 border-red-200 text-red-800" : "bg-sky-50 border-sky-200 text-sky-800"} ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 text-lg" aria-hidden>
          {isError ? "⚠️" : "ℹ️"}
        </span>
        <div className="flex-1 min-w-0">
          {children}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className={`mt-3 inline-flex items-center px-3 py-1.5 rounded-input text-sm font-medium transition-all hover:-translate-y-0.5 ${isError ? "bg-red-100 hover:bg-red-200 text-red-800" : "bg-sky-100 hover:bg-sky-200 text-sky-800"}`}
            >
              Yeniden dene
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
