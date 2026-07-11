import type { ReactNode } from "react";
import { ChoiceButton } from "../../ui/ChoiceButton";
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
