import { NativeSelect, Stack, TextInput, UnstyledButton } from "@mantine/core";
import { useState } from "react";
import type {
  AdminSessionModeFilter,
  AdminSessionSort,
  AdminSessionStateChip,
} from "../../../domain/admin/adminSessionFilters";

interface AdminSessionFiltersProps {
  query: string;
  liveOnly: boolean;
  annotatedOnly: boolean;
  mode: AdminSessionModeFilter;
  state: AdminSessionStateChip;
  sort: AdminSessionSort;
  onQueryChange: (query: string) => void;
  onLiveOnlyChange: (value: boolean) => void;
  onAnnotatedOnlyChange: (value: boolean) => void;
  onModeChange: (mode: AdminSessionModeFilter) => void;
  onStateChange: (state: AdminSessionStateChip) => void;
  onSortChange: (sort: AdminSessionSort) => void;
}

const SORT_OPTIONS: { value: AdminSessionSort; label: string }[] = [
  { value: "lastActivity", label: "Last activity" },
  { value: "lastLocation", label: "Last location" },
  { value: "lastAnnotation", label: "Last annotation" },
  { value: "annotationCount", label: "Annotation count" },
  { value: "created", label: "Created" },
];

export function AdminSessionFilters({
  query,
  liveOnly,
  annotatedOnly,
  mode,
  state,
  sort,
  onQueryChange,
  onLiveOnlyChange,
  onAnnotatedOnlyChange,
  onModeChange,
  onStateChange,
  onSortChange,
}: AdminSessionFiltersProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <Stack gap="sm">
      <TextInput
        label="Search"
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.currentTarget.value)}
        placeholder="Code, area, or host version"
        autoComplete="off"
        spellCheck={false}
      />
      <div className="jl-ops-filter-row">
        <div className="jl-ops-toggle-group">
          <UnstyledButton
            type="button"
            className="jl-ops-toggle"
            aria-pressed={liveOnly}
            onClick={() => onLiveOnlyChange(!liveOnly)}
          >
            Live
          </UnstyledButton>
          <UnstyledButton
            type="button"
            className="jl-ops-toggle"
            aria-pressed={annotatedOnly}
            onClick={() => onAnnotatedOnlyChange(!annotatedOnly)}
          >
            Annotated
          </UnstyledButton>
        </div>
        <NativeSelect
          label="Sort"
          className="jl-ops-filter-sort"
          value={sort}
          onChange={(event) => onSortChange(event.currentTarget.value as AdminSessionSort)}
          data={SORT_OPTIONS}
          w="100%"
        />
        <UnstyledButton
          type="button"
          className="jl-ops-toggle"
          aria-expanded={moreOpen}
          aria-controls="admin-session-more-filters"
          onClick={() => setMoreOpen((open) => !open)}
        >
          More filters
        </UnstyledButton>
      </div>

      {moreOpen ? (
        <div className="jl-ops-filter-row" id="admin-session-more-filters">
          <div className="jl-ops-toggle-group" role="group" aria-label="Session mode">
            {(["singleplayer", "multiplayer"] as const).map((option) => {
              const selected = mode === option;
              return (
                <UnstyledButton
                  key={option}
                  type="button"
                  className="jl-ops-toggle"
                  aria-pressed={selected}
                  onClick={() => onModeChange(selected ? "all" : option)}
                >
                  {option === "singleplayer" ? "Singleplayer" : "Multiplayer"}
                </UnstyledButton>
              );
            })}
          </div>
          <div className="jl-ops-toggle-group" role="group" aria-label="Session state">
            {(
              [
                ["hiding", "Hiding"],
                ["seek", "Seeking"],
                ["end-game", "End game"],
              ] as const
            ).map(([option, label]) => {
              const selected = state === option;
              return (
                <UnstyledButton
                  key={option}
                  type="button"
                  className="jl-ops-toggle"
                  aria-pressed={selected}
                  onClick={() => onStateChange(selected ? null : option)}
                >
                  {label}
                </UnstyledButton>
              );
            })}
          </div>
        </div>
      ) : null}
    </Stack>
  );
}
