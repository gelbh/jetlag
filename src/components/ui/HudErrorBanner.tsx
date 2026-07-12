import { HudBanner } from "./HudBanner";
import { MapFloatAlertPanel } from "./MapFloatAlert";

interface HudErrorBannerProps {
  error: import("../../domain/device/userErrors").UserErrorDisplay;
  onAction?: () => void;
}

export function HudErrorBanner({ error, onAction }: HudErrorBannerProps) {
  return (
    <HudBanner
      visible
      animated={false}
      className="pointer-events-auto mx-3 mt-1.5"
    >
      <MapFloatAlertPanel>
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
      </MapFloatAlertPanel>
    </HudBanner>
  );
}
