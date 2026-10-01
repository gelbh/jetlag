import { Button, UnstyledButton } from "@mantine/core";
import { sheetIconCloseStyle } from "@/components/ui/entry/entryChrome";
import { grayStyles, plainStyles } from "@/components/ui/entry/entryStyles";

interface SheetCloseButtonProps {
  onClick: () => void;
  label?: string;
  variant?: "text" | "raised" | "icon";
  className?: string;
}

export function SheetCloseButton({
  onClick,
  label = "Close",
  variant = "text",
  className = "",
}: SheetCloseButtonProps) {
  if (variant === "icon") {
    return (
      <UnstyledButton
        type="button"
        onClick={onClick}
        className={className.trim() || undefined}
        style={sheetIconCloseStyle}
        aria-label={label}
        styles={{
          root: {
            "&:focus-visible": {
              outline: "2px solid var(--color-action)",
              outlineOffset: 1,
            },
          },
        }}
      >
        <svg
          aria-hidden="true"
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
        </svg>
      </UnstyledButton>
    );
  }

  return (
    <Button
      type="button"
      onClick={onClick}
      className={className.trim() || undefined}
      styles={variant === "raised" ? grayStyles : plainStyles}
    >
      {label}
    </Button>
  );
}
