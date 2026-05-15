import { RADAR_RADIUS_PRESETS } from '../../domain/annotations'

interface RadarPanelProps {
  radiusMeters: number
  inside: boolean
  customRadius: string
  onRadiusChange: (radius: number) => void
  onCustomRadiusChange: (value: string) => void
  onInsideChange: (inside: boolean) => void
  onUseGps: () => void
  onPlaceAtMapCenter: () => void
  onCommit: () => void
  gpsLoading: boolean
  error?: string | null
}

export function RadarPanel({
  radiusMeters,
  inside,
  customRadius,
  onRadiusChange,
  onCustomRadiusChange,
  onInsideChange,
  onUseGps,
  onPlaceAtMapCenter,
  onCommit,
  gpsLoading,
  error,
}: RadarPanelProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-300">Radius</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {RADAR_RADIUS_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onRadiusChange(preset)}
              className={`min-h-12 rounded-xl px-3 text-sm ${
                radiusMeters === preset ? 'bg-sky-500 text-slate-950' : 'bg-slate-800'
              }`}
            >
              {preset >= 1000 ? `${preset / 1000}km` : `${preset}m`}
            </button>
          ))}
        </div>
        <label className="mt-3 block text-sm text-slate-300">
          Custom meters
          <input
            value={customRadius}
            onChange={(event) => onCustomRadiusChange(event.target.value)}
            inputMode="numeric"
            className="mt-1 min-h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-3"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onInsideChange(true)}
          className={`min-h-12 rounded-xl px-3 text-sm ${
            inside ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800'
          }`}
        >
          Inside
        </button>
        <button
          type="button"
          onClick={() => onInsideChange(false)}
          className={`min-h-12 rounded-xl px-3 text-sm ${
            !inside ? 'bg-rose-500 text-slate-50' : 'bg-slate-800'
          }`}
        >
          Outside
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onUseGps}
          disabled={gpsLoading}
          className="min-h-12 rounded-xl bg-slate-800 px-3 text-sm font-medium"
        >
          {gpsLoading ? 'Locating…' : 'Use my location'}
        </button>
        <button
          type="button"
          onClick={onPlaceAtMapCenter}
          className="min-h-12 rounded-xl bg-slate-800 px-3 text-sm font-medium"
        >
          Place at map tap
        </button>
      </div>

      <button
        type="button"
        onClick={onCommit}
        className="min-h-12 w-full rounded-xl bg-sky-500 px-3 text-sm font-semibold text-slate-950"
      >
        Add radar
      </button>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  )
}
