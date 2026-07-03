interface PopupCloseButtonProps {
  label: string;
  onClick: () => void;
}

export function PopupCloseButton({ label, onClick }: PopupCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-2 left-2 flex h-8 w-8 items-center justify-center rounded-[var(--radius-hud-sm)] text-ink-dim hover:bg-surface-raised hover:text-ink"
      aria-label={label}
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4"
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
