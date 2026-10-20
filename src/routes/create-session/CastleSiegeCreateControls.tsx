import { InsetGroup, SectionLabel } from "@/components/ui/entry/entryChrome";
import { InsetHairline } from "@/components/ui/entry/InsetRow";
import { SegmentControl } from "@/components/ui/forms/SegmentControl";
import type { SessionMode } from "@/domain/session/castleSiege/mode";

export type CastleSiegeCreateControlsProps = {
  mode: SessionMode;
  onModeChange: (mode: SessionMode) => void;
  seriesLength: 1 | 3;
  onSeriesLengthChange: (value: 1 | 3) => void;
  setupMode: "pregame" | "fairSplit";
  onSetupModeChange: (value: "pregame" | "fairSplit") => void;
  hostCastleSiegeRole: "teamA" | "teamB";
  onHostCastleSiegeRoleChange: (value: "teamA" | "teamB") => void;
  disabled?: boolean;
};

type ModeOption = {
  value: SessionMode;
  label: string;
  summary: string;
};

const MODE_OPTIONS: ModeOption[] = [
  {
    value: "classic",
    label: "Classic",
    summary: "Seekers and hiders. Same Jet Lag rules as today.",
  },
  {
    value: "castleSiege",
    label: "Castle Siege",
    summary: "Two teams, mirrored castles, series play.",
  },
];

export function CastleSiegeCreateControls({
  mode,
  onModeChange,
  seriesLength,
  onSeriesLengthChange,
  setupMode,
  onSetupModeChange,
  hostCastleSiegeRole,
  onHostCastleSiegeRoleChange,
  disabled = false,
}: CastleSiegeCreateControlsProps) {
  return (
    <div className="px-1 py-3">
      <SectionLabel>Game mode</SectionLabel>
      <InsetGroup>
        <div role="radiogroup" aria-label="Game mode">
          {MODE_OPTIONS.map((option, index) => {
            const selected = mode === option.value;
            return (
              <div key={option.value}>
                {index > 0 ? <InsetHairline insetStart="1rem" /> : null}
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${option.label}. ${option.summary}`}
                  disabled={disabled}
                  onClick={() => onModeChange(option.value)}
                  className={`min-h-12 w-full px-4 py-2.5 text-left disabled:opacity-50 ${
                    selected ? "bg-flag-soft text-flag" : "text-field-ink"
                  }`}
                >
                  <span className="block text-[1.0625rem] font-medium tracking-[-0.01em]">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-field-ink-muted">
                    {option.summary}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </InsetGroup>

      {mode === "castleSiege" ? (
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <SectionLabel>Series</SectionLabel>
            <div className="mt-2">
              <SegmentControl<"1" | "3">
                aria-label="Series length"
                variant="pill"
                value={seriesLength === 3 ? "3" : "1"}
                onChange={(value) => onSeriesLengthChange(value === "3" ? 3 : 1)}
                disabled={disabled}
                options={[
                  { value: "1", label: "Best of 1" },
                  { value: "3", label: "Best of 3" },
                ]}
              />
            </div>
          </div>

          <div>
            <SectionLabel>Setup</SectionLabel>
            <div className="mt-2">
              <SegmentControl<"pregame" | "fairSplit">
                aria-label="Setup mode"
                variant="pill"
                value={setupMode}
                onChange={onSetupModeChange}
                disabled={disabled}
                options={[
                  { value: "pregame", label: "Pregame" },
                  { value: "fairSplit", label: "Fair-split" },
                ]}
              />
            </div>
          </div>

          <div>
            <SectionLabel>Your team</SectionLabel>
            <div className="mt-2">
              <SegmentControl<"teamA" | "teamB">
                aria-label="Host team"
                variant="pill"
                value={hostCastleSiegeRole}
                onChange={onHostCastleSiegeRoleChange}
                disabled={disabled}
                options={[
                  { value: "teamA", label: "Team A" },
                  { value: "teamB", label: "Team B" },
                ]}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
