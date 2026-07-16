import type { ReactNode } from "react";

interface InlineErrorProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export function InlineError({ children, className = "", id }: InlineErrorProps) {
  return (
    <p
      id={id}
      role="alert"
      className={`jl-selectable text-sm text-status-error ${className}`.trim()}
    >
      {children}
    </p>
  );
}
