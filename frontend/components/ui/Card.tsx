import { ReactNode } from "react";

export function Card({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`rounded-card bg-white border border-black/5 transition-all duration-200 ${hover ? "hover:-translate-y-0.5 shadow-card hover:shadow-card-hover" : "shadow-card"} ${className}`}
    >
      {children}
    </div>
  );
}
