import { MotionSheet } from "../../motion/MotionSheet";
import { usePersistedDismiss } from "../../../hooks/forms/usePersistedDismiss";

const STORAGE_KEY = "jetlag.mapFirstRunDismissed";

interface MapFirstRunSheetProps {
  open: boolean;
  onDismiss: () => void;
  /** Open from Settings even after first-run dismiss. */
  forceOpen?: boolean;
}

export function MapFirstRunSheet({
  open,
  onDismiss,
  forceOpen = false,
}: MapFirstRunSheetProps) {
  const { dismissed, dismiss: persistDismiss } = usePersistedDismiss(STORAGE_KEY);

  if (dismissed && !forceOpen) {
    return null;
  }

  const dismiss = () => {
    persistDismiss();
    onDismiss();
  };

  return (
    <MotionSheet
      open={open}
      onClose={dismiss}
      ariaLabel="Map tools guide"
      maxHeightClassName="max-h-[min(50dvh,400px)]"
    >
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
            <span className="font-medium text-ink">Match, Measure, Thermo, Radar, Tent</span>{" "}
            The five game questions, always on the dock.
          </li>
          <li>
            <span className="font-medium text-ink">Draw.</span> Zone and pin
            markup tools.
          </li>
          <li>
            <span className="font-medium text-ink">Settings.</span> Layers,
            timer, and session options.
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
    </MotionSheet>
  );
}
