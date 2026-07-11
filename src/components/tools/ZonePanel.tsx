import { TextField } from "../ui/TextField";

interface ZonePanelProps {
  vertexCount: number;
  label: string;
  onLabelChange: (value: string) => void;
  onClosePolygon: () => void;
  onReset: () => void;
}

export function ZonePanel({
  vertexCount,
  label,
  onLabelChange,
  onClosePolygon,
  onReset,
}: ZonePanelProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Tap the map to add vertices. Close the polygon when the dead zone is
        outlined.
      </p>
      <p className="text-sm text-ink-dim">Vertices: {vertexCount}</p>
      <TextField
        label="Label"
        labelClassName="block text-sm text-ink-muted"
        inputClassName="mt-1 min-h-12 w-full rounded-xl border border-border bg-surface-base px-3"
        value={label}
        onChange={(event) => onLabelChange(event.target.value)}
        placeholder="Optional zone label"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onClosePolygon}
          disabled={vertexCount < 3}
          className="btn-primary w-full"
        >
          Close zone
        </button>
        <button
          type="button"
          onClick={onReset}
          className="min-h-12 rounded-xl bg-surface-raised px-3 text-sm font-medium"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
