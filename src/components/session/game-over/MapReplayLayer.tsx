import { PopupCloseButton } from "../../ui/PopupCloseButton";

interface MapReplayLayerProps {
  open: boolean;
  sessionId: string;
  onClose: () => void;
}

export function MapReplayLayer({ open, sessionId, onClose }: MapReplayLayerProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="pointer-events-auto fixed inset-0 z-[calc(var(--z-modal)+1)] bg-surface-deep">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
          Map replay
        </p>
        <PopupCloseButton label="Close map replay" onClick={onClose} />
      </div>

      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-14">
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
    </div>
  );
}
