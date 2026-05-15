import { TENTACLE_CATEGORIES } from '../../domain/annotations'

interface TentaclePanelProps {
  radiusMeters: number
  categoryId: string
  highlightedPoiId: string
  poiOptions: Array<{ id: string; name: string }>
  loading: boolean
  error?: string | null
  onRadiusChange: (value: number) => void
  onCategoryChange: (value: string) => void
  onUseGps: () => void
  onLoadPois: () => void
  onHighlightChange: (value: string) => void
  onCommit: () => void
  hasCenter: boolean
}

export function TentaclePanel({
  radiusMeters,
  categoryId,
  highlightedPoiId,
  poiOptions,
  loading,
  error,
  onRadiusChange,
  onCategoryChange,
  onUseGps,
  onLoadPois,
  onHighlightChange,
  onCommit,
  hasCenter,
}: TentaclePanelProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-300">
        Place a circle around the seekers, load POIs, then highlight the answer once the hider
        responds.
      </p>
      <label className="block text-sm text-slate-300">
        Radius (meters)
        <input
          type="number"
          value={radiusMeters}
          onChange={(event) => onRadiusChange(Number(event.target.value) || 0)}
          className="mt-1 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3"
        />
      </label>
      <label className="block text-sm text-slate-300">
        Category
        <select
          value={categoryId}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="mt-1 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3"
        >
          {TENTACLE_CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onUseGps}
          className="min-h-12 rounded-xl bg-slate-800 px-3 text-sm font-medium"
        >
          Use my location
        </button>
        <button
          type="button"
          onClick={onLoadPois}
          disabled={!hasCenter || loading}
          className="min-h-12 rounded-xl bg-slate-800 px-3 text-sm font-medium disabled:opacity-40"
        >
          {loading ? 'Loading…' : 'Load POIs'}
        </button>
      </div>
      {poiOptions.length > 0 ? (
        <label className="block text-sm text-slate-300">
          Highlight answer
          <select
            value={highlightedPoiId}
            onChange={(event) => onHighlightChange(event.target.value)}
            className="mt-1 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3"
          >
            <option value="">None yet</option>
            {poiOptions.map((poi) => (
              <option key={poi.id} value={poi.id}>
                {poi.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <button
        type="button"
        onClick={onCommit}
        disabled={!hasCenter}
        className="min-h-12 w-full rounded-xl bg-sky-500 px-3 text-sm font-semibold text-slate-950 disabled:opacity-40"
      >
        Add tentacle
      </button>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  )
}
