import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ChoiceButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  activeClassName?: string;
  inactiveClassName?: string;
  fullWidth?: boolean;
  align?: "left" | "center";
  children: ReactNode;
}

export function ChoiceButton({
  selected = false,
  activeClassName = "bg-action text-action-ink",
  inactiveClassName = "bg-surface-raised text-ink-secondary",
  fullWidth = false,
  align,
  className = "",
  children,
  type = "button",
  ...props
}: ChoiceButtonProps) {
  const alignClass =
    align === "left"
      ? "text-left"
      : align === "center"
        ? "text-center"
        : "";

  return (
    <button
      type={type}
      aria-pressed={selected}
      className={`min-h-12 rounded-[var(--radius-hud-md)] px-3 text-sm font-medium disabled:opacity-40 ${
        fullWidth ? "w-full" : ""
      } ${alignClass} ${selected ? activeClassName : inactiveClassName} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
