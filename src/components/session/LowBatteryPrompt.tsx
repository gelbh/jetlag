import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  dismissLowBatteryPromptForSession,
  readLowBatteryPromptDismissed,
  shouldOfferLowPowerMode,
} from "../../domain/batteryPrompt";
import { useBatteryStatus } from "../../hooks/useBatteryStatus";
import { useMapStore } from "../../state/mapStore";

export function LowBatteryPrompt() {
  const location = useLocation();
  const onMap = location.pathname === "/map";
  const battery = useBatteryStatus();
  const lowPowerMode = useMapStore((state) => state.lowPowerMode);
  const setLowPowerMode = useMapStore((state) => state.setLowPowerMode);
  const [dismissed, setDismissed] = useState(readLowBatteryPromptDismissed);

  if (!onMap) {
    return null;
  }

  const visible = shouldOfferLowPowerMode({
    supported: battery.supported,
    level: battery.level,
    charging: battery.charging,
    lowPowerMode,
    dismissed,
  });

  if (!visible || battery.level === null) {
    return null;
  }

  const percent = Math.round(battery.level * 100);

  const dismiss = () => {
    dismissLowBatteryPromptForSession();
    setDismissed(true);
  };

  const enableLowPowerMode = () => {
    setLowPowerMode(true);
    dismissLowBatteryPromptForSession();
    setDismissed(true);
  };

  return (
    <div
      className="jl-map-banner-top pointer-events-auto fixed inset-x-3 z-[var(--z-panel)]"
      role="dialog"
      aria-labelledby="low-battery-prompt-title"
      aria-describedby="low-battery-prompt-body"
    >
      <div className="map-float-alert mx-auto max-w-xl border-2 border-status-warning/40 bg-status-warning-surface px-3 py-3">
        <p
          id="low-battery-prompt-title"
          className="font-display text-xs font-semibold uppercase tracking-wide text-status-warning"
        >
          Battery low ({percent}%)
        </p>
        <p
          id="low-battery-prompt-body"
          className="mt-1 text-pretty text-sm leading-snug text-ink-secondary"
        >
          Switch to low power mode to reduce GPS polling, live transit, and
          background downloads while keeping core game sync.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={enableLowPowerMode}
            className="btn-primary min-h-10 flex-1 px-4 text-xs"
          >
            Enable low power
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="btn-secondary min-h-10 flex-1 px-4 text-xs"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
