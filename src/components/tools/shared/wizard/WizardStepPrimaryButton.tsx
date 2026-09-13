import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export interface WizardStepPrimaryButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export function WizardStepPrimaryButton({
  label,
  onClick,
  disabled = false,
}: WizardStepPrimaryButtonProps) {
  return (
    <Button
      type="button"
      variant={disabled ? "default" : "ghost"}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-h-9 min-w-[5.5rem] shrink-0 font-display text-xs font-semibold uppercase tracking-[0.06em]",
        !disabled &&
          "border-flag/55 text-flag hover:border-flag/45 hover:bg-flag-soft",
      )}
    >
      {label}
    </Button>
  );
}
