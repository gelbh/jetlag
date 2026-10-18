import { ActionIcon, Box, Button, Menu, TextInput } from "@mantine/core";
import type { ReactNode, Ref } from "react";

export interface AdminChipOption {
  value: string;
  label: string;
}

export interface AdminTableToolbarProps {
  tabs: ReactNode;
  query: string;
  onQueryChange(query: string): void;
  searchPlaceholder?: string;
  searchRef?: Ref<HTMLInputElement>;
  /** Replaces the Sessions chips (Needs you brings its own). */
  chips?: ReactNode;
  liveOnly?: boolean;
  onLiveOnlyChange?(on: boolean): void;
  phase?: string | null;
  phaseOptions?: AdminChipOption[];
  onPhaseChange?(phase: string | null): void;
  tier?: string | null;
  tierOptions?: AdminChipOption[];
  onTierChange?(tier: string | null): void;
  hasIncident?: boolean;
  onHasIncidentChange?(on: boolean): void;
  /** The `AdminColumnPicker`, which renders the "Columns · N of M" button. */
  picker: ReactNode;
  density: "comfortable" | "compact";
  onDensityChange(density: "comfortable" | "compact"): void;
  onCollapse?(): void;
}

const chipStyle = (on: boolean, height = 28) => ({
  height,
  padding: "0 10px",
  borderRadius: 14,
  border: on
    ? "0.5px solid transparent"
    : "0.5px solid color-mix(in oklch, var(--color-rule) 65%, transparent)",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  fontFamily: "inherit",
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
  background: on ? "var(--color-flag-soft)" : "var(--color-surface-deep)",
  color: on ? "var(--color-ink)" : "var(--color-ink-secondary)",
});

export function ToggleChip({
  label,
  on,
  onToggle,
  height,
}: {
  label: string;
  on: boolean;
  onToggle(on: boolean): void;
  height?: number;
}) {
  return (
    <Box
      component="button"
      type="button"
      aria-pressed={on}
      style={chipStyle(on, height)}
      onClick={() => onToggle(!on)}
    >
      {label}
    </Box>
  );
}

export function MenuChip({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string | null;
  options: AdminChipOption[];
  onChange(value: string | null): void;
}) {
  const current = options.find((option) => option.value === value);
  return (
    <Menu position="bottom-start" radius={12} withinPortal>
      <Menu.Target>
        <Box component="button" type="button" style={chipStyle(Boolean(current))}>
          {name}: {current?.label ?? "any"}
        </Box>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item onClick={() => onChange(null)}>Any</Menu.Item>
        {options.map((option) => (
          <Menu.Item key={option.value} onClick={() => onChange(option.value)}>
            {option.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

function noop() {}

/** Comp `.tool`: 10px/14px padding, 32px controls, 28px chips. */
export function AdminTableToolbar({
  tabs,
  query,
  onQueryChange,
  searchPlaceholder = "Search code, area or host",
  searchRef,
  chips,
  liveOnly = false,
  onLiveOnlyChange = noop,
  phase = null,
  phaseOptions = [],
  onPhaseChange = noop,
  tier = null,
  tierOptions = [],
  onTierChange = noop,
  hasIncident = false,
  onHasIncidentChange = noop,
  picker,
  density,
  onDensityChange,
  onCollapse,
}: AdminTableToolbarProps) {
  return (
    <Box
      role="toolbar"
      aria-label="Table tools"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        flex: "none",
        flexWrap: "wrap",
        borderBottom: "0.5px solid color-mix(in oklch, var(--color-rule) 65%, transparent)",
      }}
    >
      <Box style={{ flex: "none", width: 260 }}>{tabs}</Box>
      <TextInput
        aria-label="Search sessions"
        placeholder={searchPlaceholder}
        ref={searchRef}
        radius={12}
        w={220}
        value={query}
        onChange={(event) => onQueryChange(event.currentTarget.value)}
        styles={{ input: { height: 32, minHeight: 32, fontSize: 13 } }}
      />
      {chips ?? (
        <>
          <ToggleChip label="Live only" on={liveOnly} onToggle={onLiveOnlyChange} />
          <MenuChip name="Phase" value={phase} options={phaseOptions} onChange={onPhaseChange} />
          <MenuChip name="Tier" value={tier} options={tierOptions} onChange={onTierChange} />
          <ToggleChip label="Has incident" on={hasIncident} onToggle={onHasIncidentChange} />
        </>
      )}
      <Box style={{ flex: 1 }} />
      {picker}
      <Button
        variant="default"
        h={32}
        fz={13}
        radius={12}
        size="compact-sm"
        style={{ background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
        onClick={() => onDensityChange(density === "compact" ? "comfortable" : "compact")}
      >
        Density: {density === "compact" ? "Compact" : "Comfortable"}
      </Button>
      {onCollapse && (
        <ActionIcon
          variant="default"
          size={32}
          radius={12}
          aria-label="Collapse to sidebar"
          title="Collapse to sidebar"
          onClick={onCollapse}
          style={{ background: "var(--color-surface-raised)", color: "var(--color-ink)" }}
        >
          ⟨
        </ActionIcon>
      )}
    </Box>
  );
}
