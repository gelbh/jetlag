import { Button } from "@mantine/core";
import type { TransitRouteFilter } from "@/domain/map/transit";
import { SettingsToggleRow } from "@/components/session/settings/SettingsToggleRow";
import {
  InsetGroup,
  compactFilledStyles,
  compactGrayStyles,
} from "@/components/ui/entry/entryChrome";
import { SegmentControl } from "@/components/ui/forms/SegmentControl";

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

function statusLine({
  metroLabel,
  premiumSession,
  enabled,
  liveSupported,
  liveEnabled,
  routeCount,
  stopCount,
  vehicleCount,
  loadingStatic,
  loadingLive,
  liveDataStale,
  lastUpdated,
}: {
  metroLabel: string | null;
  premiumSession: boolean;
  enabled: boolean;
  liveSupported: boolean;
  liveEnabled: boolean;
  routeCount: number;
  stopCount: number;
  vehicleCount: number;
  loadingStatic: boolean;
  loadingLive: boolean;
  liveDataStale: boolean;
  lastUpdated?: string;
}): string {
  const parts: string[] = [];
  if (metroLabel) {
    parts.push(metroLabel);
  }
  if (!premiumSession) {
    parts.push("Live vehicles require a Premium session.");
  } else if (!enabled) {
    parts.push("Transit overlay hidden");
  } else if (liveSupported) {
    parts.push("Static routes and stops. Live vehicles when enabled.");
  } else {
    parts.push("Static routes and stops only. Live vehicles unavailable here.");
  }
  if (enabled) {
    parts.push(
      `${routeCount} routes · ${stopCount} stops${
        liveEnabled ? ` · ${vehicleCount} live` : ""
      }`,
    );
  }
  if (loadingStatic || loadingLive) {
    parts.push("updating…");
  }
  if (liveDataStale) {
    parts.push("live data delayed");
  }
  if (lastUpdated) {
    parts.push(`updated ${new Date(lastUpdated).toLocaleTimeString()}`);
  }
  return parts.join(" · ");
}

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
  if (variant === "inline") {
    return (
      <div className="space-y-2">
        <InsetGroup>
          <SettingsToggleRow
            label="Transit overlay"
            description={
              metroLabel
                ? `${metroLabel} routes and stops on the map.`
                : "Routes and stops on the map."
            }
            checked={enabled}
            onChange={(next) => {
              if (next !== enabled) {
                onToggleEnabled();
              }
            }}
          />
          <SettingsToggleRow
            showSeparator
            label="Live vehicles"
            description={
              !premiumSession
                ? "Requires a Premium session."
                : liveSupported
                  ? "Moving vehicles when the feed is available."
                  : "Unavailable in this play area."
            }
            checked={liveEnabled}
            disabled={!enabled || !liveSupported || !premiumSession}
            onChange={(next) => {
              if (next !== liveEnabled) {
                onToggleLive();
              }
            }}
          />
        </InsetGroup>
        {enabled ? (
          <>
            <SegmentControl
              variant="pill"
              value={routeFilter}
              options={FILTER_OPTIONS}
              onChange={onRouteFilterChange}
              aria-label="Transit route filter"
            />
            <p className="px-1 text-xs text-[var(--color-field-ink-muted)]">
              {statusLine({
                metroLabel: null,
                premiumSession,
                enabled,
                liveSupported,
                liveEnabled,
                routeCount,
                stopCount,
                vehicleCount,
                loadingStatic,
                loadingLive,
                liveDataStale,
                lastUpdated,
              })}
            </p>
          </>
        ) : null}
        {error ? (
          <p className="px-1 text-xs text-[var(--color-halt)]">{error}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="pointer-events-auto space-y-2 rounded-[14px] p-3" style={{
      backgroundColor: "oklch(from var(--color-canvas) l c h / 0.88)",
      border: "0.33px solid oklch(from var(--color-rule) l c h / 0.65)",
      backdropFilter: "blur(24px) saturate(1.35)",
      WebkitBackdropFilter: "blur(24px) saturate(1.35)",
    }}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="compact-sm"
          onClick={onToggleEnabled}
          styles={enabled ? compactFilledStyles : compactGrayStyles}
        >
          Transit
        </Button>
        <Button
          type="button"
          size="compact-sm"
          onClick={onToggleLive}
          disabled={!enabled || !liveSupported}
          styles={liveEnabled ? compactFilledStyles : compactGrayStyles}
        >
          Live
        </Button>
      </div>
      <SegmentControl
        variant="pill"
        value={routeFilter}
        options={FILTER_OPTIONS}
        onChange={onRouteFilterChange}
        disabled={!enabled}
        aria-label="Transit route filter"
      />

      <p className="text-xs text-[var(--color-field-ink-muted)]">
        {statusLine({
          metroLabel,
          premiumSession,
          enabled,
          liveSupported,
          liveEnabled,
          routeCount,
          stopCount,
          vehicleCount,
          loadingStatic,
          loadingLive,
          liveDataStale,
          lastUpdated,
        })}
      </p>

      {error ? (
        <p className="text-xs text-[var(--color-halt)]">{error}</p>
      ) : null}
    </div>
  );
}
