import { Button } from "@mantine/core";
import { jetlagBrand } from "@/theme/theme";

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
      onClick={onClick}
      disabled={disabled}
      size="compact-sm"
      styles={{
        root: {
          minHeight: "2.25rem",
          minWidth: "5.5rem",
          flexShrink: 0,
          fontFamily: "var(--font-display)",
          fontSize: "0.75rem",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          border: disabled
            ? `1px solid ${jetlagBrand.rule}`
            : `1px solid oklch(from ${jetlagBrand.flag} l c h / 0.55)`,
          backgroundColor: disabled ? jetlagBrand.canvas : "transparent",
          color: disabled ? jetlagBrand.fieldInk : jetlagBrand.flag,
          "&:hover": disabled
            ? undefined
            : {
                borderColor: `oklch(from ${jetlagBrand.flag} l c h / 0.45)`,
                backgroundColor: jetlagBrand.flagSoft,
              },
        },
      }}
    >
      {label}
    </Button>
  );
}
