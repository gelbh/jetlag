import { useState } from "react";
import { MobileSheet } from "../ui/MobileSheet";

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

  if (!open || dismissed) {
    return null;
  }

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore quota / private mode
    }
    onDismiss();
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-[var(--z-modal)]">
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
                Mark the live search map for your team. Quick tools sit on the
                bottom bar; question tools live under More.
              </p>
            </div>

            <ul className="space-y-2 text-sm text-ink-secondary">
              <li>
                <span className="font-medium text-ink">Radar</span> — draw a
                search circle on the map
              </li>
              <li>
                <span className="font-medium text-ink">Zone</span> — outline an
                area to search or rule out
              </li>
              <li>
                <span className="font-medium text-ink">Pin</span> — drop a note
                at a point
              </li>
              <li>
                <span className="font-medium text-ink">More</span> — Matching,
                Measuring, Thermometer, Tentacles
              </li>
            </ul>

            <button
              type="button"
              onClick={dismiss}
              className="btn-primary min-h-12 w-full"
            >
              Got it
            </button>
          </div>
        </MobileSheet>
      </div>
    </div>
  );
}
