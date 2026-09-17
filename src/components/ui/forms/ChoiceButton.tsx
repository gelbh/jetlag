import type { ButtonHTMLAttributes, ReactNode } from "react";
import { UnstyledButton } from "@mantine/core";
import {
  iosChoiceChipStyles,
  type IosChoiceTone,
} from "@/components/ui/apple/iosEntryChrome";
import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";

interface ChoiceButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  activeClassName?: string;
  inactiveClassName?: string;
  fullWidth?: boolean;
  align?: "left" | "center";
  children: ReactNode;
}

function toneFromActiveClass(activeClassName: string): IosChoiceTone {
  if (activeClassName.includes("status-success")) {
    return "success";
  }
  if (activeClassName.includes("status-negative")) {
    return "danger";
  }
  return "default";
}

export function ChoiceButton({
  selected = false,
  activeClassName = "bg-flag text-flag-ink",
  inactiveClassName = "bg-canvas text-field-ink",
  fullWidth = false,
  align,
  className = "",
  children,
  type = "button",
  ...props
}: ChoiceButtonProps) {
  const mantinePlayerUi = usePlayerUiMantine();
  const alignClass =
    align === "left"
      ? "text-left"
      : align === "center"
        ? "text-center"
        : "";

  if (mantinePlayerUi) {
    return (
      <UnstyledButton
        type={type}
        aria-pressed={selected}
        data-player-ux-world="mantine"
        className={`${fullWidth ? "w-full" : ""} ${alignClass} ${className}`.trim()}
        styles={iosChoiceChipStyles(
          selected,
          selected ? toneFromActiveClass(activeClassName) : "default",
        )}
        {...props}
      >
        {children}
      </UnstyledButton>
    );
  }

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
