import { adminSessionPhaseLabel } from "../../domain/admin/sessionPhase";
import type { AdminSessionPhaseFilter } from "../../domain/admin/adminSessionFilters";

export type { AdminSessionPhaseFilter };

const PHASE_FILTERS: AdminSessionPhaseFilter[] = [
  "all",
  "waiting",
  "hiding",
  "seek",
  "end-game-pending",
  "end-game-active",
];

interface AdminSessionFiltersProps {
  query: string;
  phase: AdminSessionPhaseFilter;
  multiplayerOnly: boolean;
  onQueryChange: (query: string) => void;
  onPhaseChange: (phase: AdminSessionPhaseFilter) => void;
  onMultiplayerOnlyChange: (value: boolean) => void;
}

export function AdminSessionFilters({
  query,
  phase,
  multiplayerOnly,
  onQueryChange,
  onPhaseChange,
  onMultiplayerOnlyChange,
}: AdminSessionFiltersProps) {
  return (
    <div className="space-y-3">
      <label className="field-label">
        Search live sessions
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Code or area"
          className="field-input"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Session phase">
        {PHASE_FILTERS.map((option) => {
          const selected = phase === option;
          const label =
            option === "all" ? "All phases" : adminSessionPhaseLabel(option);

          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onPhaseChange(option)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                selected
                  ? "border-brand-blue/40 bg-brand-blue/10 text-brand-blue"
                  : "border-border bg-surface-raised text-ink-muted"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={multiplayerOnly}
          onChange={(event) => onMultiplayerOnlyChange(event.target.checked)}
          className="size-4"
        />
        Multiplayer only
      </label>
    </div>
  );
}
