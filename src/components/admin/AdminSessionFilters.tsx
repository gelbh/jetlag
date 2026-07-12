import type { AdminSessionPhase } from "../../services/admin/adminSessions";
import { adminSessionPhaseLabel } from "../../domain/admin/sessionPhase";

export type AdminSessionPhaseFilter = AdminSessionPhase | "all";

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
  onQueryChange: (query: string) => void;
  onPhaseChange: (phase: AdminSessionPhaseFilter) => void;
}

export function AdminSessionFilters({
  query,
  phase,
  onQueryChange,
  onPhaseChange,
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
    </div>
  );
}
