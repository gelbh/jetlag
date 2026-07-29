import { TextAreaField } from "../ui/forms/TextAreaField";

interface PinPanelProps {
  label: string;
  onLabelChange: (value: string) => void;
  onCommit: () => void;
  hasPoint: boolean;
  isSubmitting?: boolean;
}

export function PinPanel({
  label,
  onLabelChange,
  onCommit,
  hasPoint,
  isSubmitting = false,
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
      <TextAreaField
        label="Label"
        labelClassName="block text-sm text-ink-muted"
        inputClassName="mt-1 min-h-20 w-full rounded-xl border border-border bg-surface-base px-3 py-2 text-sm"
        value={label}
        onChange={(event) => onLabelChange(event.target.value)}
        placeholder="Closer to the train station than us"
      />
      <button
        type="button"
        onClick={onCommit}
        disabled={!hasPoint || label.trim().length === 0 || isSubmitting}
        className="btn-primary w-full"
      >
        {isSubmitting ? "Adding…" : "Add note"}
      </button>
    </div>
  );
}
