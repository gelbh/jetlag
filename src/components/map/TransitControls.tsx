import type { TransitRouteFilter } from "../../domain/transit";

interface TransitControlsProps {
  enabled: boolean;
  liveEnabled: boolean;
  routeFilter: TransitRouteFilter;
  metroLabel: string | null;
  liveSupported: boolean;
  loadingStatic: boolean;
  loadingLive: boolean;
  stopCount: number;
  routeCount: number;
  vehicleCount: number;
  lastUpdated?: string;
  error?: string | null;
  onToggleEnabled: () => void;
  onToggleLive: () => void;
  onRouteFilterChange: (value: TransitRouteFilter) => void;
}

const FILTER_OPTIONS: Array<{ value: TransitRouteFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "rail", label: "Rail" },
  { value: "metro", label: "Metro" },
  { value: "tram", label: "Tram" },
  { value: "bus", label: "Bus" },
  { value: "ferry", label: "Ferry" },
];

export function TransitControls({
  enabled,
  liveEnabled,
  routeFilter,
  metroLabel,
  liveSupported,
  loadingStatic,
  loadingLive,
  stopCount,
  routeCount,
  vehicleCount,
  lastUpdated,
  error,
  onToggleEnabled,
  onToggleLive,
  onRouteFilterChange,
}: TransitControlsProps) {
  return (
    <div className="pointer-events-auto rounded-2xl border border-slate-700 bg-slate-950/90 p-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggleEnabled}
          className={`min-h-12 rounded-xl px-3 text-sm font-medium ${
            enabled ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-100"
          }`}
        >
          Transit
        </button>
        <button
          type="button"
          onClick={onToggleLive}
          disabled={!enabled || !liveSupported}
          className={`min-h-12 rounded-xl px-3 text-sm font-medium disabled:opacity-40 ${
            liveEnabled ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-100"
          }`}
        >
          Live
        </button>
        <label className="min-h-12 rounded-xl bg-slate-800 px-3 text-sm text-slate-100">
          <span className="sr-only">Route filter</span>
          <select
            value={routeFilter}
            onChange={(event) =>
              onRouteFilterChange(event.target.value as TransitRouteFilter)
            }
            disabled={!enabled}
            className="h-12 bg-transparent text-sm outline-none disabled:opacity-40"
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-slate-100" />
          Rail
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          Metro
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Tram
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          Bus
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        {metroLabel ? `${metroLabel} · ` : ""}
        {enabled
          ? liveSupported
            ? "Static routes and stops. Live vehicles when enabled."
            : "Static routes and stops only. Live vehicles are unavailable here."
          : "Transit overlay hidden"}
        {enabled
          ? ` · ${routeCount} routes · ${stopCount} stops${
              liveEnabled ? ` · ${vehicleCount} live vehicles` : ""
            }`
          : ""}
        {loadingStatic || loadingLive ? " · updating…" : ""}
        {lastUpdated ? ` · updated ${new Date(lastUpdated).toLocaleTimeString()}` : ""}
      </p>

      {error ? <p className="mt-2 text-xs text-amber-200">{error}</p> : null}
    </div>
  );
}
