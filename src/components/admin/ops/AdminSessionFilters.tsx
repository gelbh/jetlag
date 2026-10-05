import { Button, Group, NativeSelect, Stack, TextInput } from "@mantine/core";
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
      <Group gap="xs" wrap="wrap" align="flex-end">
        <Button
          type="button"
          size="compact-xs"
          radius="xl"
          variant={liveOnly ? "light" : "default"}
          aria-pressed={liveOnly}
          onClick={() => onLiveOnlyChange(!liveOnly)}
          tt="uppercase"
        >
          Live
        </Button>
        <Button
          type="button"
          size="compact-xs"
          radius="xl"
          variant={annotatedOnly ? "light" : "default"}
          aria-pressed={annotatedOnly}
          onClick={() => onAnnotatedOnlyChange(!annotatedOnly)}
          tt="uppercase"
        >
          Annotated
        </Button>
        <TextInput
          label="Search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          placeholder="Code, area, or host version"
          autoComplete="off"
          spellCheck={false}
          style={{ flex: 1, minWidth: "12rem" }}
        />
        <NativeSelect
          label="Sort"
          value={sort}
          onChange={(event) => onSortChange(event.currentTarget.value as AdminSessionSort)}
          data={SORT_OPTIONS}
          w={176}
        />
        <Button
          type="button"
          size="compact-xs"
          variant="subtle"
          aria-expanded={moreOpen}
          aria-controls="admin-session-more-filters"
          onClick={() => setMoreOpen((open) => !open)}
        >
          More filters
        </Button>
      </Group>

      {moreOpen ? (
        <Group gap="xs" wrap="wrap" id="admin-session-more-filters">
          <Group gap={6} wrap="wrap" role="group" aria-label="Session mode">
            {(["singleplayer", "multiplayer"] as const).map((option) => {
              const selected = mode === option;
              return (
                <Button
                  key={option}
                  type="button"
                  size="compact-xs"
                  radius="xl"
                  variant={selected ? "light" : "default"}
                  aria-pressed={selected}
                  onClick={() => onModeChange(selected ? "all" : option)}
                  tt="uppercase"
                >
                  {option === "singleplayer" ? "Singleplayer" : "Multiplayer"}
                </Button>
              );
            })}
          </Group>
          <Group gap={6} wrap="wrap" role="group" aria-label="Session state">
            {(
              [
                ["hiding", "Hiding"],
                ["seek", "Seeking"],
                ["end-game", "End game"],
              ] as const
            ).map(([option, label]) => {
              const selected = state === option;
              return (
                <Button
                  key={option}
                  type="button"
                  size="compact-xs"
                  radius="xl"
                  variant={selected ? "light" : "default"}
                  aria-pressed={selected}
                  onClick={() => onStateChange(selected ? null : option)}
                  tt="uppercase"
                >
                  {label}
                </Button>
              );
            })}
          </Group>
        </Group>
      ) : null}
    </Stack>
  );
}
