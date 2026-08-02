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
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-9 min-w-[5.5rem] shrink-0 items-center justify-center rounded-[var(--radius-hud-md)] border border-border/85 bg-surface-panel px-3 font-display text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted motion-safe:transition-[background,border-color,color] motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action disabled:pointer-events-none disabled:opacity-35 ${
        disabled
          ? ""
          : "border-highlight/55 text-highlight hover:border-highlight/45 hover:bg-surface-raised"
      }`}
    >
      {label}
    </button>
  );
}
