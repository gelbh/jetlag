/**
 * Catalog rail — row select advances; no sibling CONTINUE strip/button.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 */
import { ListSelectRow } from "@/components/tools/shared/controls/ListSelectRow";

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
  return (
    <div
      data-testid="ask-catalog-rail"
      className="ask-catalog-rail pointer-events-auto hud-panel"
      role="listbox"
      aria-label={ariaLabel}
    >
      {hint ? (
        <p className="ask-catalog-rail__hint text-xs text-ink-muted">{hint}</p>
      ) : null}
      <div className="ask-catalog-rail__list jl-scroll">
        {rows.map((row) => (
          <div key={row.id} role="option" aria-selected={selectedId === row.id}>
            <ListSelectRow
              selected={selectedId === row.id}
              onClick={() => onSelect(row.id)}
            >
              {row.label}
            </ListSelectRow>
          </div>
        ))}
      </div>
    </div>
  );
}
