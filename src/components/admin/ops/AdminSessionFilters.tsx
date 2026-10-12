import {
  Button,
  Chip,
  Group,
  Kbd,
  Popover,
  Select,
  Stack,
  TextInput,
  Tooltip,
} from "@mantine/core";
import type { Ref } from "react";
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
  searchRef?: Ref<HTMLInputElement>;
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

const STATE_OPTIONS = [
  ["hiding", "Hiding"],
  ["seek", "Seeking"],
  ["end-game", "End game"],
] as const;

export function AdminSessionFilters({
  query,
  liveOnly,
  annotatedOnly,
  mode,
  state,
  sort,
  searchRef,
  onQueryChange,
  onLiveOnlyChange,
  onAnnotatedOnlyChange,
  onModeChange,
  onStateChange,
  onSortChange,
}: AdminSessionFiltersProps) {
  return (
    <Stack gap="xs">
      <Tooltip
        label={
          <>
            Press <Kbd>/</Kbd> to search
          </>
        }
      >
        <TextInput
          ref={searchRef}
          label="Search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          placeholder="Code, area, or host version"
          autoComplete="off"
          spellCheck={false}
        />
      </Tooltip>
      <Group gap="xs" wrap="wrap">
        <Chip size="xs" checked={liveOnly} onChange={onLiveOnlyChange}>
          Live
        </Chip>
        <Chip size="xs" checked={annotatedOnly} onChange={onAnnotatedOnlyChange}>
          Annotated
        </Chip>
        <Popover position="bottom-start">
          <Popover.Target>
            <Button type="button" variant="outline" size="compact-sm">
              More filters
            </Button>
          </Popover.Target>
          <Popover.Dropdown>
            <Stack gap="xs">
              <Group gap="xs" role="group" aria-label="Session mode">
                {(["singleplayer", "multiplayer"] as const).map((option) => {
                  const selected = mode === option;
                  return (
                    <Chip
                      key={option}
                      size="xs"
                      checked={selected}
                      onChange={() => onModeChange(selected ? "all" : option)}
                    >
                      {option === "singleplayer" ? "Singleplayer" : "Multiplayer"}
                    </Chip>
                  );
                })}
              </Group>
              <Group gap="xs" role="group" aria-label="Session state">
                {STATE_OPTIONS.map(([option, label]) => {
                  const selected = state === option;
                  return (
                    <Chip
                      key={option}
                      size="xs"
                      checked={selected}
                      onChange={() => onStateChange(selected ? null : option)}
                    >
                      {label}
                    </Chip>
                  );
                })}
              </Group>
            </Stack>
          </Popover.Dropdown>
        </Popover>
      </Group>
      <Select
        label="Sort"
        data={SORT_OPTIONS}
        value={sort}
        allowDeselect={false}
        onChange={(value) => {
          if (value) onSortChange(value as AdminSessionSort);
        }}
      />
    </Stack>
  );
}
