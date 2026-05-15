interface ZonePanelProps {
  vertexCount: number
  label: string
  onLabelChange: (value: string) => void
  onClosePolygon: () => void
  onReset: () => void
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
      <p className="text-sm text-slate-300">
        Tap the map to add vertices. Close the polygon when the dead zone is outlined.
      </p>
      <p className="text-sm text-slate-400">Vertices: {vertexCount}</p>
      <label className="block text-sm text-slate-300">
        Label
        <input
          value={label}
          onChange={(event) => onLabelChange(event.target.value)}
          className="mt-1 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3"
          placeholder="Optional zone label"
        />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onClosePolygon}
          disabled={vertexCount < 3}
          className="min-h-12 rounded-xl bg-sky-500 px-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
        >
          Close zone
        </button>
        <button
          type="button"
          onClick={onReset}
          className="min-h-12 rounded-xl bg-slate-800 px-3 text-sm font-medium"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
