import type { ReactNode } from "react";

interface SendToHidersButtonProps {
  costLabel: string;
  isSubmitting?: boolean;
  disabled?: boolean;
  onClick: () => void;
  instruction?: ReactNode;
  warning?: ReactNode;
  error?: string | null;
  /** When false, render copy only — wizard rail owns the commit CTA. */
  showButton?: boolean;
}

export function SendToHidersButton({
  costLabel,
  isSubmitting = false,
  disabled = false,
  onClick,
  instruction,
  warning,
  error,
  showButton = true,
}: SendToHidersButtonProps) {
  return (
    <>
      {instruction ? (
        typeof instruction === "string" ? (
          <p className="text-xs text-ink-dim">{instruction}</p>
        ) : (
          instruction
        )
      ) : null}
      {warning ? (
        typeof warning === "string" ? (
          <p className="text-sm text-status-warning">{warning}</p>
        ) : (
          warning
        )
      ) : null}
      {showButton ? (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-busy={isSubmitting}
          className="btn-primary min-h-12 w-full disabled:opacity-40"
        >
          {isSubmitting ? "Sending…" : `Send to hiders (${costLabel})`}
        </button>
      ) : null}
      {error ? (
        <p className="text-sm text-status-error">{error}</p>
      ) : null}
    </>
  );
}
