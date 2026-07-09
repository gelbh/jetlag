import type { UserErrorDisplay } from "../../domain/device/userErrors";

interface HudErrorBannerProps {
  error: UserErrorDisplay;
  onAction?: () => void;
}

export function HudErrorBanner({ error, onAction }: HudErrorBannerProps) {
  return (
    <div
      className="map-float-alert pointer-events-auto mx-3 mt-1.5 flex items-center justify-between gap-3 border-2 border-status-error/40 bg-status-error-surface px-3 py-2"
      role="alert"
    >
      <div className="min-w-0 text-left">
        <p className="text-sm font-semibold text-status-error">{error.title}</p>
        <p className="text-xs text-ink">{error.message}</p>
      </div>
      {error.action && onAction && error.actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="btn-secondary min-h-10 shrink-0 px-3 text-xs"
        >
          {error.actionLabel}
        </button>
      ) : null}
    </div>
  );
}
