import type { ReactNode } from "react";
import { HUD_BINARY_YES } from "../../ui/hudTokens";

interface ListSelectRowProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  align?: "left" | "center";
}

export function ListSelectRow({
  selected,
  onClick,
  children,
  align = "left",
}: ListSelectRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-12 w-full rounded-[var(--radius-hud-md)] px-3 text-sm ${
        align === "left" ? "text-left" : "text-center"
      } ${selected ? HUD_BINARY_YES : "bg-surface-raised text-ink-secondary"}`}
    >
      {children}
    </button>
  );
}
