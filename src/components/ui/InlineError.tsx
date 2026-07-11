import type { ReactNode } from "react";

interface InlineErrorProps {
  children: ReactNode;
  className?: string;
}

export function InlineError({ children, className = "" }: InlineErrorProps) {
  return (
    <p className={`text-sm text-status-error ${className}`.trim()}>{children}</p>
  );
}
