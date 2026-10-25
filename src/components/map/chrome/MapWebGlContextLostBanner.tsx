type MapWebGlContextLostBannerProps = {
  visible: boolean;
  onRetry: () => void;
  onReload: () => void;
};

export function MapWebGlContextLostBanner({
  visible,
  onRetry,
  onReload,
}: MapWebGlContextLostBannerProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[var(--z-toast)] px-3 pt-[max(0.5rem,var(--safe-area-top))]">
      <div
        role="alert"
        className="pointer-events-auto mx-auto flex max-w-[min(calc(100%-1.5rem),24rem)] flex-col gap-2 rounded-md border border-rule bg-canvas/95 px-3 py-2 shadow-sm"
      >
        <p className="font-display text-xs font-semibold uppercase tracking-[0.08em] text-highlight">
          Map lost graphics context
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-rule bg-field px-2 py-1 text-xs font-semibold text-ink"
            onClick={onRetry}
          >
            Retry
          </button>
          <button
            type="button"
            className="rounded border border-rule bg-field px-2 py-1 text-xs font-semibold text-ink"
            onClick={onReload}
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
