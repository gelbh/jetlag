import type {
  AdminSessionModeFilter,
  AdminSessionSort,
  AdminSessionStateChip,
} from "../../domain/admin/adminSessionFilters";

interface AdminSessionFiltersProps {
  query: string;
  liveOnly: boolean;
  mode: AdminSessionModeFilter;
  state: AdminSessionStateChip;
  sort: AdminSessionSort;
  onQueryChange: (query: string) => void;
  onLiveOnlyChange: (value: boolean) => void;
  onModeChange: (mode: AdminSessionModeFilter) => void;
  onStateChange: (state: AdminSessionStateChip) => void;
  onSortChange: (sort: AdminSessionSort) => void;
}

function chipClassName(selected: boolean): string {
  return selected
    ? "border-brand-blue/40 bg-brand-blue/10 text-brand-blue"
    : "border-border bg-surface-raised text-ink-muted";
}

export function AdminSessionFilters({
  query,
  liveOnly,
  mode,
  state,
  sort,
  onQueryChange,
  onLiveOnlyChange,
  onModeChange,
  onStateChange,
  onSortChange,
}: AdminSessionFiltersProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={liveOnly}
          onClick={() => onLiveOnlyChange(!liveOnly)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${chipClassName(liveOnly)}`}
        >
          Live
        </button>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Session mode">
          {(["singleplayer", "multiplayer"] as const).map((option) => {
            const selected = mode === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => onModeChange(selected ? "all" : option)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${chipClassName(selected)}`}
              >
                {option === "singleplayer" ? "Singleplayer" : "Multiplayer"}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Session state">
          {(
            [
              ["hiding", "Hiding"],
              ["seek", "Seeking"],
              ["end-game", "End game"],
            ] as const
          ).map(([option, label]) => {
            const selected = state === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => onStateChange(selected ? null : option)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${chipClassName(selected)}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="field-label min-w-[12rem] flex-1">
          Search
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Code, area, or host version"
            className="field-input"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label className="field-label w-44">
          Sort
          <select
            value={sort}
            onChange={(event) =>
              onSortChange(event.target.value as AdminSessionSort)
            }
            className="field-input"
          >
            <option value="lastActivity">Last activity</option>
            <option value="lastLocation">Last location</option>
            <option value="created">Created</option>
          </select>
        </label>
      </div>
    </div>
  );
}
