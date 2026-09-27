import { Box } from "@mantine/core";

export type SettingsSegment = "map" | "game" | "session";

const SEGMENTS: ReadonlyArray<{ id: SettingsSegment; label: string }> = [
  { id: "map", label: "Map" },
  { id: "game", label: "Game" },
  { id: "session", label: "Session" },
];

interface SettingsSegmentControlProps {
  value: SettingsSegment;
  onChange: (segment: SettingsSegment) => void;
}

/** Equal-width Survey segment track for settings (tablist ↔ tabpanel). */
export function SettingsSegmentControl({
  value,
  onChange,
}: SettingsSegmentControlProps) {
  return (
    <Box
      role="tablist"
      aria-label="Settings sections"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${SEGMENTS.length}, minmax(0, 1fr))`,
        gap: "0.2rem",
        padding: "0.2rem",
        borderRadius: 12,
        backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
        border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
      }}
    >
      {SEGMENTS.map((segment) => {
        const selected = value === segment.id;
        return (
          <Box
            key={segment.id}
            component="button"
            type="button"
            role="tab"
            id={`settings-tab-${segment.id}`}
            aria-selected={selected}
            aria-controls={`settings-panel-${segment.id}`}
            onClick={() => onChange(segment.id)}
            style={{
              minHeight: "2.75rem",
              border: "none",
              borderRadius: 10,
              paddingInline: "0.5rem",
              fontSize: "0.9375rem",
              fontWeight: selected ? 590 : 500,
              letterSpacing: "-0.01em",
              cursor: "pointer",
              color: selected
                ? "var(--color-field-ink)"
                : "var(--color-field-ink-muted)",
              backgroundColor: selected
                ? "oklch(from var(--color-flag) l c h / 0.22)"
                : "transparent",
              transition:
                "background-color 140ms ease, color 140ms ease, transform 80ms ease",
            }}
          >
            {segment.label}
          </Box>
        );
      })}
    </Box>
  );
}
