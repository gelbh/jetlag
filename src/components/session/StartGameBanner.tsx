interface StartGameBannerProps {
  hidden?: boolean;
  canStart: boolean;
  onStart: () => void;
}

export function StartGameBanner({
  hidden = false,
  canStart,
  onStart,
}: StartGameBannerProps) {
  if (hidden) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[var(--z-banner)] flex justify-center px-3"
      style={{
        bottom: "calc(var(--dock-height) + env(safe-area-inset-bottom) + 0.35rem)",
      }}
    >
      {canStart ? (
        <button
          type="button"
          onClick={onStart}
          className="pointer-events-auto min-h-12 rounded-[var(--radius-hud-lg)] bg-status-success px-8 text-sm font-semibold text-surface-deep shadow-[var(--shadow-hud-float)] transition-opacity hover:opacity-90"
        >
          Start game
        </button>
      ) : (
        <p className="pointer-events-auto text-pretty text-sm text-ink-muted">
          Waiting for host to start.
        </p>
      )}
    </div>
  );
}
