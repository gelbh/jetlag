import { useState } from "react";
import { MobileSheet } from "../ui/MobileSheet";
import { useScrollLock } from "../../hooks/useScrollLock";

const STORAGE_KEY = "jetlag.mapFirstRunDismissed";

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

interface MapFirstRunSheetProps {
  open: boolean;
  onDismiss: () => void;
}

export function MapFirstRunSheet({ open, onDismiss }: MapFirstRunSheetProps) {
  const [dismissed] = useState(readDismissed);
  useScrollLock(open && !dismissed);

  if (!open || dismissed) {
    return null;
  }

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage unavailable
    }
    onDismiss();
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-[var(--z-modal)] overscroll-contain">
      <button
        type="button"
        className="absolute inset-0 hud-scrim"
        aria-label="Dismiss map guide"
        onClick={dismiss}
      />
      <div onClick={(event) => event.stopPropagation()}>
        <MobileSheet maxHeightClassName="max-h-[min(50dvh,400px)]">
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-ink">Map tools</h2>
              <p className="text-pretty text-sm text-ink-muted">
                Mark the live search map for your team. Question tools sit on
                the bottom bar; zone and pin live under Draw (or More on narrow
                phones).
              </p>
            </div>

            <ul className="space-y-2 text-sm text-ink-secondary">
              <li>
                <span className="font-medium text-ink">Match, Measure, Thermo, Radar, Tent.</span>{" "}
                The five game questions, always on the dock.
              </li>
              <li>
                <span className="font-medium text-ink">Draw.</span> Zone and pin
                markup tools.
              </li>
              <li>
                <span className="font-medium text-ink">Setup.</span> Layers,
                timer, and session options.
              </li>
            </ul>

            <button
              type="button"
              onClick={dismiss}
              className="btn-primary min-h-12 w-full"
            >
              Close
            </button>
          </div>
        </MobileSheet>
      </div>
    </div>
  );
}
