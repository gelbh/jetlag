import {
  BoatIcon,
  BusIcon,
  CirclesFourIcon,
  DotsThreeOutlineIcon,
  MountainsIcon,
  TrainIcon,
  TrainRegionalIcon,
  TrainSimpleIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { SectionLabel } from "@/components/ui/entry/entryChrome";
import {
  isTransitStationFilterAll,
  type TransitRouteMode,
  type TransitStationFilter,
  toggleTransitStationMode,
} from "@/domain/map/transit";

const MODE_OPTIONS: Array<{
  value: TransitRouteMode | "all";
  label: string;
  icon: ReactNode;
}> = [
  { value: "all", label: "All", icon: <CirclesFourIcon size={22} weight="bold" aria-hidden /> },
  { value: "rail", label: "Rail", icon: <TrainRegionalIcon size={22} weight="bold" aria-hidden /> },
  { value: "metro", label: "Metro", icon: <TrainSimpleIcon size={22} weight="bold" aria-hidden /> },
  { value: "tram", label: "Tram", icon: <TrainIcon size={22} weight="bold" aria-hidden /> },
  { value: "bus", label: "Bus", icon: <BusIcon size={22} weight="bold" aria-hidden /> },
  { value: "ferry", label: "Ferry", icon: <BoatIcon size={22} weight="bold" aria-hidden /> },
  {
    value: "funicular",
    label: "Funicular",
    icon: <MountainsIcon size={22} weight="bold" aria-hidden />,
  },
  // GTFS catch-all bucket (wire token stays `other`); not a free-text field.
  {
    value: "other",
    label: "Misc",
    icon: <DotsThreeOutlineIcon size={22} weight="bold" aria-hidden />,
  },
];

function isModeSelected(value: TransitStationFilter, mode: TransitRouteMode | "all"): boolean {
  if (mode === "all") {
    return isTransitStationFilterAll(value);
  }
  return value !== "all" && value.includes(mode);
}

export function TransitStationModePicker({
  value,
  onChange,
  disabled,
  visible,
}: {
  value: TransitStationFilter;
  onChange: (value: TransitStationFilter) => void;
  disabled?: boolean;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <div className="px-1 py-1">
      <SectionLabel>Stations for hide / measure / match</SectionLabel>
      <div role="group" aria-label="Transit station modes" className="mt-3 grid grid-cols-4 gap-2">
        {MODE_OPTIONS.map((option) => {
          const selected = isModeSelected(value, option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              aria-label={option.label}
              disabled={disabled}
              onClick={() => onChange(toggleTransitStationMode(value, option.value))}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[0.75rem] font-semibold disabled:opacity-50 ${
                selected
                  ? "border-flag bg-flag-soft text-flag"
                  : "border-rule bg-canvas text-field-ink"
              }`}
            >
              {option.icon}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 px-0.5 text-[0.75rem] leading-snug text-field-ink-muted">
        Misc covers GTFS types that are not rail, metro, tram, bus, ferry, or funicular. Select
        multiple modes to allow any of them.
      </p>
    </div>
  );
}
