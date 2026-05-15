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
    <div className="space-y-4">
      <p className="text-sm text-slate-300">
        Tap the map to place a note for matching or measuring questions.
      </p>
      {hasPoint ? (
        <p className="text-sm text-slate-400">
          Location pinned on the map. Tap again to move it.
        </p>
      ) : null}
      <label className="block text-sm text-slate-300">
        Label
        <textarea
          value={label}
          onChange={(event) => onLabelChange(event.target.value)}
          className="mt-1 min-h-24 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"
          placeholder="Closer to the train station than us"
        />
      </label>
      <button
        type="button"
        onClick={onCommit}
        disabled={!hasPoint || label.trim().length === 0}
        className="min-h-12 w-full rounded-xl bg-sky-500 px-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
      >
        Add note
      </button>
    </div>
  );
}
