import {
  BoatIcon,
  BusIcon,
  CirclesFourIcon,
  TrainIcon,
  TrainRegionalIcon,
  TrainSimpleIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { SectionLabel } from "@/components/ui/entry/entryChrome";
import type { TransitRouteFilter } from "@/domain/map/transit";

const MODE_OPTIONS: Array<{
  value: TransitRouteFilter;
  label: string;
  icon: ReactNode;
}> = [
  { value: "all", label: "All", icon: <CirclesFourIcon size={22} weight="bold" aria-hidden /> },
  { value: "rail", label: "Rail", icon: <TrainRegionalIcon size={22} weight="bold" aria-hidden /> },
  { value: "metro", label: "Metro", icon: <TrainSimpleIcon size={22} weight="bold" aria-hidden /> },
  { value: "tram", label: "Tram", icon: <TrainIcon size={22} weight="bold" aria-hidden /> },
  { value: "bus", label: "Bus", icon: <BusIcon size={22} weight="bold" aria-hidden /> },
  { value: "ferry", label: "Ferry", icon: <BoatIcon size={22} weight="bold" aria-hidden /> },
  // Feeds that only tag extended types as "other" until rebuild; keep selectable for authority.
  {
    value: "other",
    label: "Other",
    icon: <CirclesFourIcon size={22} weight="regular" aria-hidden />,
  },
];

export function TransitStationModePicker({
  value,
  onChange,
  disabled,
  visible,
}: {
  value: TransitRouteFilter;
  onChange: (value: TransitRouteFilter) => void;
  disabled?: boolean;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <div className="px-1 py-1">
      <SectionLabel>Stations for hide / measure / match</SectionLabel>
      <div
        role="radiogroup"
        aria-label="Transit station modes"
        className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6"
      >
        {MODE_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={option.label}
              disabled={disabled}
              onClick={() => onChange(option.value)}
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
    </div>
  );
}
