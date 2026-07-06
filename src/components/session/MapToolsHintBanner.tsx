import { useState } from "react";

const STORAGE_KEY = "jetlag.mapToolsHintDismissed";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

interface MapToolsHintBannerProps {
  hidden?: boolean;
}

export function MapToolsHintBanner({ hidden = false }: MapToolsHintBannerProps) {
  const [dismissed, setDismissed] = useState(readDismissed);

  if (hidden || dismissed) {
    return null;
  }

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage unavailable
    }
    setDismissed(true);
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[var(--z-banner)] px-3"
      style={{
        bottom:
          "calc(var(--dock-height) + env(safe-area-inset-bottom) + var(--chrome-gap-above-dock))",
      }}
    >
      <div className="pointer-events-auto hud-panel mx-auto flex max-w-md items-start gap-3 px-3 py-2.5">
        <p className="flex-1 text-pretty text-sm leading-snug text-ink-muted">
          Question tools are on the{" "}
          <span className="font-display font-semibold uppercase tracking-wide text-ink">
            bottom bar
          </span>
          . Zone and pin live under{" "}
          <span className="font-display font-semibold uppercase tracking-wide text-ink">
            Draw
          </span>
          .
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="btn-secondary shrink-0 px-3 py-2 text-xs"
        >
          Close
        </button>
      </div>
    </div>
  );
}
