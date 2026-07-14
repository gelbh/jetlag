import { AnimatedOverlay } from "../../ui/AnimatedOverlay";
import { PopupCloseButton } from "../../ui/PopupCloseButton";

interface MapReplayLayerProps {
  open: boolean;
  sessionId: string;
  onClose: () => void;
}

export function MapReplayLayer({ open, sessionId, onClose }: MapReplayLayerProps) {
  return (
    <AnimatedOverlay
      open={open}
      onClose={onClose}
      dismissible
      ariaLabel="Map replay"
      maxHeightClassName="max-h-[100dvh]"
      sheetClassName="mx-auto h-full max-w-none"
      pinned={
        <div className="flex items-center justify-between border-b border-border px-4 pb-3 pt-2">
          <p className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Map replay
          </p>
          <PopupCloseButton label="Close map replay" onClick={onClose} />
        </div>
      }
    >
      <div className="flex flex-col items-center justify-center gap-3 px-6 pb-4">
        <div
          className="flex aspect-[4/3] w-full max-w-md items-center justify-center rounded-xl border border-dashed border-border bg-surface-panel text-sm text-ink-muted"
          aria-hidden="true"
        >
          Map placeholder
        </div>
        <p className="max-w-sm text-center text-sm text-ink-muted">
          Replay scrubber for session {sessionId} will show start pins, trails,
          and hiding zones in a later phase.
        </p>
      </div>
    </AnimatedOverlay>
  );
}
