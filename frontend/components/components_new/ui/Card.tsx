import { ReactNode, HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  hover?: boolean;
};

export function Card({
  children,
  className = "",
  hover = false,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-card bg-white border border-black/5 transition-all duration-200 ${hover ? "hover:-translate-y-0.5 shadow-card hover:shadow-card-hover" : "shadow-card"} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
