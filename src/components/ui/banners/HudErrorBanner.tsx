import { HudBanner } from "../hud/HudBanner";
import { MapFloatAlertPanel } from "./MapFloatAlert";
import type { UserErrorDisplay } from "../../../domain/device/userErrors";

interface HudErrorBannerProps {
  error: UserErrorDisplay;
  onAction?: () => void;
  onSecondaryAction?: () => void;
}

export function HudErrorBanner({
  error,
  onAction,
  onSecondaryAction,
}: HudErrorBannerProps) {
  const showPrimaryAction = Boolean(error.action && onAction && error.actionLabel);
  const showSecondaryAction = Boolean(
    error.secondaryAction &&
      onSecondaryAction &&
      error.secondaryActionLabel,
  );

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
        {showPrimaryAction || showSecondaryAction ? (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            {showPrimaryAction ? (
              <button
                type="button"
                onClick={onAction}
                className="btn-secondary min-h-10 shrink-0 px-3 text-xs"
              >
                {error.actionLabel}
              </button>
            ) : null}
            {showSecondaryAction ? (
              <button
                type="button"
                onClick={onSecondaryAction}
                className="btn-primary min-h-10 shrink-0 px-3 text-xs"
              >
                {error.secondaryActionLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </MapFloatAlertPanel>
    </HudBanner>
  );
}
