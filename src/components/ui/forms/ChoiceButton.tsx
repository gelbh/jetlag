import { UnstyledButton } from "@mantine/core";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { type ChoiceTone, choiceChipStyles } from "@/components/ui/entry/entryChrome";

interface ChoiceButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  activeClassName?: string;
  fullWidth?: boolean;
  align?: "left" | "center";
  children: ReactNode;
}

function toneFromActiveClass(activeClassName: string): ChoiceTone {
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
  fullWidth = false,
  align,
  className = "",
  children,
  type = "button",
  ...props
}: ChoiceButtonProps) {
  const alignClass = align === "left" ? "text-left" : align === "center" ? "text-center" : "";

  return (
    <UnstyledButton
      type={type}
      aria-pressed={selected}
      className={`${fullWidth ? "w-full" : ""} ${alignClass} ${className}`.trim()}
      styles={choiceChipStyles(
        selected,
        selected ? toneFromActiveClass(activeClassName) : "default",
      )}
      {...props}
    >
      {children}
    </UnstyledButton>
  );
}
