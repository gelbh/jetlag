interface PinPanelProps {
  label: string;
  onLabelChange: (value: string) => void;
  onCommit: () => void;
  hasPoint: boolean;
}

export function PinPanel({
  label,
  onLabelChange,
  onCommit,
  hasPoint,
}: PinPanelProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs leading-snug text-ink-muted">
        Tap the map to place a note for matching or measuring questions.
      </p>
      {hasPoint ? (
        <p className="text-xs text-ink-dim">
          Location pinned on the map. Tap again to move it.
        </p>
      ) : null}
      <label className="block text-sm text-ink-muted">
        Label
        <textarea
          value={label}
          onChange={(event) => onLabelChange(event.target.value)}
          className="mt-1 min-h-20 w-full rounded-xl border border-border bg-surface-base px-3 py-2 text-sm"
          placeholder="Closer to the train station than us"
        />
      </label>
      <button
        type="button"
        onClick={onCommit}
        disabled={!hasPoint || label.trim().length === 0}
        className="btn-primary w-full"
      >
        Add note
      </button>
    </div>
  );
}
