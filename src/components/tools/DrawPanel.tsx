interface DrawPanelProps {
  pointCount: number;
  drawing: boolean;
  busy: boolean;
  onClear: () => void;
}

export function DrawPanel({
  pointCount,
  drawing,
  busy,
  onClear,
}: DrawPanelProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        Drag on the map to scribble. Release to save the stroke.
      </p>
      <p className="text-sm text-ink-dim">
        {drawing
          ? "Drawing…"
          : busy
            ? "Saving…"
            : pointCount > 0
              ? `Last stroke: ${pointCount} points`
              : "Ready"}
      </p>
      <button
        type="button"
        onClick={onClear}
        disabled={pointCount === 0 || busy}
        className="btn-secondary min-h-11 w-full"
      >
        Clear draft
      </button>
    </div>
  );
}
