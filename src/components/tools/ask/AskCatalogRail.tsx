/**
 * Catalog rail — row select advances; no sibling CONTINUE strip/button.
 * Spec: ask-surface-kit-design rev 2026-08-05b.
 * Optional `groupLabel` on rows renders sticky section headers (Matching).
 * Optional `columns={2|3}` lays category tiles in a multi-column grid under each group.
 */
import { Paper, Text, UnstyledButton } from "@mantine/core";
import { ListSelectRow } from "@/components/tools/shared/controls/ListSelectRow";
import {
  catalogTileStyles,
  mapChromeSurfaceStyles,
} from "@/components/ui/entry/entryChrome";
import { type ReactNode } from "react";

export type AskCatalogRailRow = {
  id: string;
  label: string;
  /** Optional leading icon (e.g. Matching category glyph). */
  icon?: ReactNode;
  /** When set, rows with the same label share a section heading above them. */
  groupLabel?: string;
  /**
   * Replaces the label node (e.g. inline distance field).
   * Tile uses a non-button host so nested inputs stay valid HTML.
   */
  content?: ReactNode;
};

type AskCatalogRailProps = {
  rows: readonly AskCatalogRailRow[];
  selectedId?: string | null;
  onSelect: (id: string) => void;
  "aria-label"?: string;
  hint?: string;
  /** 1 = stacked list (default); 2|3|4 = tile grid under each group heading. */
  columns?: 1 | 2 | 3 | 4;
};

type CatalogSection = {
  groupLabel?: string;
  items: AskCatalogRailRow[];
};

function sectionRows(rows: readonly AskCatalogRailRow[]): CatalogSection[] {
  const sections: CatalogSection[] = [];
  for (const row of rows) {
    const label = row.groupLabel;
    const last = sections[sections.length - 1];
    if (label && last && last.groupLabel === label) {
      last.items.push(row);
      continue;
    }
    if (!label && last && last.groupLabel === undefined) {
      last.items.push(row);
      continue;
    }
    sections.push({ groupLabel: label, items: [row] });
  }
  return sections;
}


function CatalogTileIcon({
  icon,
  selected,
  columns,
}: {
  icon: ReactNode;
  selected: boolean;
  columns: 1 | 2 | 3 | 4;
}) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: columns >= 3 ? 32 : 36,
        height: columns >= 3 ? 32 : 36,
        borderRadius: 10,
        backgroundColor: selected
          ? "oklch(from var(--color-flag) l c h / 0.18)"
          : "oklch(from var(--color-field-ink) l c h / 0.08)",
        color: selected ? "var(--color-flag)" : "var(--color-field-ink)",
      }}
    >
      {icon}
    </span>
  );
}

export function AskCatalogRail({
  rows,
  selectedId = null,
  onSelect,
  "aria-label": ariaLabel = "Catalog",
  hint = "Tap a row to advance",
  columns = 1,
}: AskCatalogRailProps) {
  const sections = sectionRows(rows);
  const multiCol = columns > 1;
  const gridClass =
    columns === 3
      ? "ask-catalog-rail__grid grid grid-cols-3 gap-2"
      : columns === 2
        ? "ask-catalog-rail__grid grid grid-cols-2 gap-2"
        : "flex flex-col gap-2";

  const list = (
    <div className="ask-catalog-rail__list jl-scroll" role="list">
      {sections.map((section, sectionIndex) => (
        <div
          key={section.groupLabel ?? `section-${sectionIndex}`}
          className="ask-catalog-rail__section"
        >
          {section.groupLabel ? (
            <div
              role="presentation"
              data-ask-catalog-group=""
              className="ask-catalog-rail__group"
              style={{
                padding: "0.65rem 0.25rem 0.35rem",
                position: "sticky",
                top: 0,
                zIndex: 1,
                background: "oklch(from var(--color-canvas) l c h / 0.92)",
              }}
            >
              <Text
                size="xs"
                fw={650}
                tt="uppercase"
                style={{
                  letterSpacing: "0.04em",
                  color: "var(--color-field-ink-muted)",
                }}
              >
                {section.groupLabel}
              </Text>
            </div>
          ) : null}
          <div className={gridClass}>
            {section.items.map((row) => {
              const selected = selectedId === row.id;
              const tileBody = (
                <>
                  {row.icon && multiCol ? (
                    <CatalogTileIcon
                      icon={row.icon}
                      selected={selected}
                      columns={columns}
                    />
                  ) : null}
                  {row.content ? (
                    row.content
                  ) : (
                    <span className="min-w-0 px-0.5 text-center leading-snug">
                      {row.label}
                    </span>
                  )}
                </>
              );
              if (multiCol) {
                const tileRoot = {
                  ...catalogTileStyles(selected).root,
                  ...(columns === 3
                    ? {
                        minHeight: "4rem",
                        padding: "0.55rem 0.35rem",
                        gap: 6,
                        fontSize: "0.75rem",
                      }
                    : null),
                };
                return (
                  <div key={row.id} role="listitem" className="min-w-0">
                    <UnstyledButton
                      {...(row.content
                        ? {
                            component: "div" as const,
                            role: "button",
                            tabIndex: 0,
                            "aria-label": row.label,
                          }
                        : { type: "button" as const })}
                      aria-pressed={selected}
                      onClick={() => onSelect(row.id)}
                      styles={{ root: tileRoot }}
                    >
                      {tileBody}
                    </UnstyledButton>
                  </div>
                );
              }
              return (
                <div key={row.id} role="listitem" className="min-w-0">
                  <ListSelectRow
                    selected={selected}
                    onClick={() => onSelect(row.id)}
                    align={multiCol ? "center" : "left"}
                  >
                    {row.content ? (
                      row.content
                    ) : row.icon ? (
                      <span
                        className={
                          multiCol
                            ? "inline-flex w-full flex-col items-center gap-1.5 text-center"
                            : "inline-flex w-full items-center gap-3"
                        }
                        style={{ color: "inherit" }}
                      >
                        <span
                          className={
                            multiCol
                              ? "inline-flex h-6 w-6 shrink-0 items-center justify-center"
                              : "inline-flex h-5 w-5 shrink-0 items-center justify-center"
                          }
                          aria-hidden
                          style={{ color: "currentColor" }}
                        >
                          {row.icon}
                        </span>
                        <span
                          className={
                            multiCol
                              ? "min-w-0 text-[0.8125rem] font-medium leading-snug"
                              : "min-w-0 flex-1 text-left leading-snug"
                          }
                        >
                          {row.label}
                        </span>
                      </span>
                    ) : (
                      row.label
                    )}
                  </ListSelectRow>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  const body = (
    <>
      {hint ? (
        <p
          className="ask-catalog-rail__hint text-xs text-field-ink-muted"
          style={{
            margin: "0 0 0.5rem",
            color: "var(--color-field-ink-muted)",
            fontSize: "0.75rem",
          }}
        >
          {hint}
        </p>
      ) : null}
      {list}
    </>
  );

  return (
    <Paper
      data-testid="ask-catalog-rail"
      className="ask-catalog-rail pointer-events-auto"
      role="group"
      aria-label={ariaLabel}
      radius={16}
      p="sm"
      styles={{
        root: {
          ...mapChromeSurfaceStyles,
          boxShadow: "none",
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
