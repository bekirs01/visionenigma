import { ButtonHTMLAttributes, ReactNode } from "react";

export function Button({
  children,
  variant = "secondary",
  className = "",
  disabled,
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-input font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
  const primary = "bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 focus:ring-indigo-500";
  const secondary = "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 active:translate-y-0 focus:ring-slate-400";
  return (
    <button
      className={`${base} ${variant === "primary" ? primary : secondary} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
