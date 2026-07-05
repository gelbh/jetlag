import type { TransitRouteFilter } from "../../domain/transit";

interface TransitControlsProps {
  enabled: boolean;
  liveEnabled: boolean;
  routeFilter: TransitRouteFilter;
  metroLabel: string | null;
  liveSupported: boolean;
  premiumSession?: boolean;
  loadingStatic: boolean;
  loadingLive: boolean;
  liveDataStale?: boolean;
  stopCount: number;
  routeCount: number;
  vehicleCount: number;
  lastUpdated?: string;
  error?: string | null;
  onToggleEnabled: () => void;
  onToggleLive: () => void;
  onRouteFilterChange: (value: TransitRouteFilter) => void;
  variant?: "panel" | "inline";
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
  premiumSession = true,
  loadingStatic,
  loadingLive,
  liveDataStale = false,
  stopCount,
  routeCount,
  vehicleCount,
  lastUpdated,
  error,
  onToggleEnabled,
  onToggleLive,
  onRouteFilterChange,
  variant = "panel",
}: TransitControlsProps) {
  const wrapperClassName =
    variant === "panel"
      ? "pointer-events-auto hud-panel rounded-[var(--radius-hud-lg)] p-3"
      : "space-y-2";

  return (
    <div className={wrapperClassName}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggleEnabled}
          className={`min-h-12 rounded-xl px-3 text-sm font-medium ${
            enabled ? "bg-action text-action-ink" : "bg-surface-raised text-ink"
          }`}
        >
          Transit
        </button>
        <button
          type="button"
          onClick={onToggleLive}
          disabled={!enabled || !liveSupported}
          className={`min-h-12 rounded-xl px-3 text-sm font-medium disabled:opacity-40 ${
            liveEnabled ? "bg-status-success text-action-ink" : "bg-surface-raised text-ink"
          }`}
        >
          Live
        </button>
        <label className="min-h-12 rounded-xl bg-surface-raised px-3 text-sm text-ink">
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

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-dim">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-ink" />
          Rail
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-action" />
          Metro
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-status-success" />
          Tram
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-status-warning" />
          Bus
        </span>
      </div>

      <p className="mt-2 text-xs text-ink-dim">
        {metroLabel ? `${metroLabel} · ` : ""}
        {!premiumSession
          ? "Live vehicles require a Premium session."
          : enabled
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
        {liveDataStale ? " · live data delayed" : ""}
        {lastUpdated ? ` · updated ${new Date(lastUpdated).toLocaleTimeString()}` : ""}
      </p>

      {error ? <p className="mt-2 text-xs text-status-warning">{error}</p> : null}
    </div>
  );
}
