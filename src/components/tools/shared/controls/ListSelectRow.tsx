import type { ReactNode } from "react";
import { ChoiceButton } from "@/components/ui/forms/ChoiceButton";
import { HUD_BINARY_YES } from "@/components/ui/hud/hudTokens";

interface ListSelectRowProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  align?: "left" | "center";
  disabled?: boolean;
}

export function ListSelectRow({
  selected,
  onClick,
  children,
  align = "left",
  disabled = false,
}: ListSelectRowProps) {
  return (
    <ChoiceButton
      selected={selected}
      activeClassName={HUD_BINARY_YES}
      onClick={onClick}
      disabled={disabled}
      fullWidth
      align={align}
    >
      {children}
    </ChoiceButton>
  );
}
