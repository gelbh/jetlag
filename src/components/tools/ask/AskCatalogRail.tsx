/**
 * Catalog rail — row select advances; no sibling CONTINUE strip/button.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { Paper } from "@mantine/core";
import { ListSelectRow } from "@/components/tools/shared/controls/ListSelectRow";
import { iosMapChromeSurfaceStyles } from "@/components/ui/apple/iosEntryChrome";
import { usePlayerUiMantine } from "@/hooks/feature/usePlayerUiMantine";

export type AskCatalogRailRow = {
  id: string;
  label: string;
};

type AskCatalogRailProps = {
  rows: readonly AskCatalogRailRow[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  "aria-label"?: string;
  hint?: string;
};

export function AskCatalogRail({
  rows,
  selectedId = null,
  onSelect,
  "aria-label": ariaLabel = "Catalog",
  hint = "Tap a row to advance",
}: AskCatalogRailProps) {
  const mantinePlayerUi = usePlayerUiMantine();

  const body = (
    <>
      {hint ? (
        <p
          className="ask-catalog-rail__hint text-xs text-field-ink-muted"
          style={
            mantinePlayerUi
              ? {
                  margin: "0 0 0.5rem",
                  color: "var(--color-field-ink-muted)",
                  fontSize: "0.75rem",
                }
              : undefined
          }
        >
          {hint}
        </p>
      ) : null}
      <div className="ask-catalog-rail__list jl-scroll" role="list">
        {rows.map((row) => (
          <div key={row.id} role="listitem">
            <ListSelectRow
              selected={selectedId === row.id}
              onClick={() => onSelect(row.id)}
            >
              {row.label}
            </ListSelectRow>
          </div>
        ))}
      </div>
    </>
  );

  if (mantinePlayerUi) {
    return (
      <Paper
        data-testid="ask-catalog-rail"
        data-player-ux-world="mantine"
        className="ask-catalog-rail pointer-events-auto"
        role="group"
        aria-label={ariaLabel}
        radius={16}
        p="sm"
        styles={{
          root: {
            ...iosMapChromeSurfaceStyles,
            maxHeight: "var(--ask-hud-rail-max-height, 40dvh)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {body}
      </Paper>
    );
  }

  return (
    <div
      data-testid="ask-catalog-rail"
      className="ask-catalog-rail pointer-events-auto ask-hud-panel"
      role="group"
      aria-label={ariaLabel}
    >
      {body}
    </div>
  );
}
