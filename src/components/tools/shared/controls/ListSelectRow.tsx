import type { ReactNode } from "react";
import { ChoiceButton } from "../../../ui/forms/ChoiceButton";
import { HUD_BINARY_YES } from "../../../ui/hud/hudTokens";

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
    <ChoiceButton
      selected={selected}
      activeClassName={HUD_BINARY_YES}
      onClick={onClick}
      fullWidth
      align={align}
    >
      {children}
    </ChoiceButton>
  );
}
