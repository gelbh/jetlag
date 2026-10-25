import { InsetGroup } from "@/components/ui/entry/entryChrome";
import { InsetHairline } from "@/components/ui/entry/InsetRow";
import type { CastleSiegeTeamRole } from "@/domain/session/castleSiege/teamRole";

export type CastleSiegeSeatPickerProps = {
  value: CastleSiegeTeamRole;
  onChange: (seat: CastleSiegeTeamRole) => void;
  disabled?: boolean;
};

type SeatOption = {
  value: CastleSiegeTeamRole;
  label: string;
  summary: string;
};

const SEAT_OPTIONS: SeatOption[] = [
  { value: "teamA", label: "Team A", summary: "Playing team. Share the seat code with teammates." },
  { value: "teamB", label: "Team B", summary: "Playing team. Share the seat code with teammates." },
  {
    value: "referee",
    label: "Referee",
    summary: "Runs the match. Ask the host for the referee code.",
  },
  {
    value: "observer",
    label: "Observer",
    summary: "Watch the series. Ask the host for the observer code.",
  },
];

export function CastleSiegeSeatPicker({
  value,
  onChange,
  disabled = false,
}: CastleSiegeSeatPickerProps) {
  return (
    <InsetGroup>
      <div role="radiogroup" aria-label="Castle Siege seat">
        {SEAT_OPTIONS.map((option, index) => {
          const selected = value === option.value;
          return (
            <div key={option.value}>
              {index > 0 ? <InsetHairline insetStart="1rem" /> : null}
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${option.label}. ${option.summary}`}
                disabled={disabled}
                onClick={() => onChange(option.value)}
                className={`min-h-12 w-full px-4 py-2.5 text-left disabled:opacity-50 ${
                  selected ? "bg-flag-soft text-flag" : "text-field-ink"
                }`}
              >
                <span className="block text-[1.0625rem] font-medium tracking-[-0.01em]">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs text-field-ink-muted">{option.summary}</span>
              </button>
            </div>
          );
        })}
      </div>
    </InsetGroup>
  );
}
