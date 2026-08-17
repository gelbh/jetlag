import { Button } from "../button";

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
      <button
        type="button"
        onClick={onClick}
        className={`jl-sync-detail-panel__close ${className}`.trim()}
        aria-label={label}
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
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={variant === "raised" ? "default" : "ghost"}
      onClick={onClick}
      className={`min-h-11 ${className}`.trim()}
    >
      {label}
    </Button>
  );
}
