import { Box } from "@mantine/core";
import type { KeyboardEvent, ReactNode } from "react";
import type { AdminTablePrefs } from "@/domain/admin/adminTablePrefs";

export interface AdminColumn<Row> {
  id: string;
  label: string;
  defaultVisible: boolean;
  pinned?: boolean;
  numeric?: boolean;
  headerTitle?: string;
  render(row: Row): ReactNode;
  sortValue?(row: Row): number | string | null;
}

export interface AdminDataTableProps<Row> {
  columns: AdminColumn<Row>[];
  rows: Row[];
  rowKey(row: Row): string;
  prefs: AdminTablePrefs;
  onPrefsChange(prefs: AdminTablePrefs): void;
  selectedKey?: string | null;
  onOpen(row: Row): void;
  rowMuted?(row: Row): boolean;
  empty?: ReactNode;
  footer?: ReactNode;
}

const hairline = "0.5px solid color-mix(in oklch, var(--color-rule) 65%, transparent)";
const cellSeparator = "0.5px solid color-mix(in oklch, var(--color-rule) 30%, transparent)";

/** Raw-value sort; nulls always last whatever the direction. */
export function sortAdminRows<Row>(
  rows: readonly Row[],
  column: AdminColumn<Row> | undefined,
  dir: "asc" | "desc",
): Row[] {
  const sortValue = column?.sortValue;
  if (!sortValue) return [...rows];
  const sign = dir === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: sortValue(row) }))
    .sort((a, b) => {
      if (a.value == null && b.value == null) return a.index - b.index;
      if (a.value == null) return 1;
      if (b.value == null) return -1;
      const delta =
        typeof a.value === "number" && typeof b.value === "number"
          ? a.value - b.value
          : String(a.value).localeCompare(String(b.value));
      return delta === 0 ? a.index - b.index : delta * sign;
    })
    .map((entry) => entry.row);
}

/** Comp `table.grid`: sticky 34px header, 40/48px rows, hairlines, orange sort arrow. */
export function AdminDataTable<Row>({
  columns,
  rows,
  rowKey,
  prefs,
  onPrefsChange,
  selectedKey,
  onOpen,
  rowMuted,
  empty,
  footer,
}: AdminDataTableProps<Row>) {
  const byId = new Map(columns.map((column) => [column.id, column]));
  const visible = prefs.visible.flatMap((id) => {
    const column = byId.get(id);
    return column ? [column] : [];
  });
  const sorted = prefs.sort ? sortAdminRows(rows, byId.get(prefs.sort.id), prefs.sort.dir) : rows;
  const rowHeight = prefs.density === "compact" ? 40 : 48;

  const cycleSort = (id: string) => {
    const current = prefs.sort;
    const next =
      current?.id !== id
        ? { id, dir: "desc" as const }
        : current.dir === "desc"
          ? { id, dir: "asc" as const }
          : null;
    onPrefsChange({ ...prefs, sort: next });
  };

  const onRowKey = (event: KeyboardEvent, row: Row) => {
    if (event.key === "Enter" && event.target === event.currentTarget) {
      event.preventDefault();
      onOpen(row);
    }
  };

  return (
    <Box style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
      <Box
        component="table"
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <thead>
          <tr>
            {visible.map((column, index) => {
              const sortable = Boolean(column.sortValue);
              const active = prefs.sort?.id === column.id ? prefs.sort : null;
              return (
                <Box
                  component="th"
                  key={column.id}
                  scope="col"
                  title={column.headerTitle}
                  aria-sort={
                    active ? (active.dir === "desc" ? "descending" : "ascending") : undefined
                  }
                  style={{
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                    background: "var(--color-surface-panel)",
                    height: 34,
                    padding: 0,
                    borderBottom: hairline,
                    borderLeft: index > 0 ? cellSeparator : undefined,
                    textAlign: column.numeric ? "right" : "left",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    color: active ? "var(--color-ink)" : "var(--color-ink-muted)",
                  }}
                >
                  {sortable ? (
                    <Box
                      component="button"
                      type="button"
                      className="admin-unstyled-control"
                      onClick={() => cycleSort(column.id)}
                      style={{
                        boxSizing: "border-box",
                        display: "block",
                        width: "100%",
                        height: 34,
                        lineHeight: "34px",
                        padding: "0 10px",
                        cursor: "pointer",
                      }}
                    >
                      {column.label}
                      {active && (
                        <Box
                          component="span"
                          aria-hidden="true"
                          style={{ color: "var(--color-flag)" }}
                        >
                          {active.dir === "desc" ? " ↓" : " ↑"}
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Box component="span" style={{ display: "block", padding: "0 10px" }}>
                      {column.label}
                    </Box>
                  )}
                </Box>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const key = rowKey(row);
            const selected = key === selectedKey;
            const muted = rowMuted?.(row) ?? false;
            return (
              <Box
                component="tr"
                key={key}
                tabIndex={0}
                aria-current={selected ? "true" : undefined}
                data-selected={selected ? "true" : undefined}
                onClick={() => onOpen(row)}
                onKeyDown={(event: KeyboardEvent) => onRowKey(event, row)}
                style={{ cursor: "pointer" }}
              >
                {visible.map((column, index) => (
                  <Box
                    component="td"
                    key={column.id}
                    style={{
                      height: rowHeight,
                      padding: "0 10px",
                      borderBottom: hairline,
                      borderLeft: index > 0 ? cellSeparator : undefined,
                      whiteSpace: "nowrap",
                      textAlign: column.numeric ? "right" : "left",
                      color: muted ? "var(--color-ink-muted)" : "var(--color-ink-secondary)",
                      background: selected ? "var(--color-flag-soft)" : undefined,
                      boxShadow:
                        selected && index === 0 ? "inset 3px 0 0 var(--color-flag)" : undefined,
                    }}
                  >
                    {column.render(row)}
                  </Box>
                ))}
              </Box>
            );
          })}
        </tbody>
      </Box>
      {sorted.length === 0 && empty}
      {footer}
    </Box>
  );
}
