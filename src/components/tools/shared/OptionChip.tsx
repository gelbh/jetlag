import type { ReactNode } from "react";
import { ChoiceButton } from "../../ui/ChoiceButton";

interface OptionChipProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}

export function OptionChip({
  selected,
  onClick,
  children,
  disabled = false,
}: OptionChipProps) {
  return (
    <ChoiceButton selected={selected} onClick={onClick} disabled={disabled}>
      {children}
    </ChoiceButton>
  );
}

interface OptionChipRowProps {
  children: ReactNode;
}

export function OptionChipRow({ children }: OptionChipRowProps) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}
