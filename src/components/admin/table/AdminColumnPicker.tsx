import { Box, Button, Checkbox, Popover, TextInput } from "@mantine/core";
import { type KeyboardEvent, useState } from "react";
import type { AdminTablePrefs } from "@/domain/admin/adminTablePrefs";
import { DESK_HAIRLINE, RAISED_BG } from "../shared/adminSurface";
import type { AdminColumn } from "./AdminDataTable";

export interface AdminColumnPickerProps<Row> {
  columns: AdminColumn<Row>[];
  prefs: AdminTablePrefs;
  defaults: AdminTablePrefs;
  onPrefsChange(prefs: AdminTablePrefs): void;
  height?: number;
}

export function AdminColumnPicker<Row>({
  columns,
  prefs,
  defaults,
  onPrefsChange,
  height = 32,
}: AdminColumnPickerProps<Row>) {
  const [opened, setOpened] = useState(false);
  const [find, setFind] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);

  const byId = new Map(columns.map((column) => [column.id, column]));
  const visibleIds = prefs.visible.filter((id) => byId.has(id));
  const visibleSet = new Set(visibleIds);
  const ordered = [
    ...visibleIds.flatMap((id) => byId.get(id) ?? []),
    ...columns.filter((column) => !visibleSet.has(column.id)),
  ];
  const needle = find.trim().toLowerCase();
  const shown = needle
    ? ordered.filter((column) => column.label.toLowerCase().includes(needle))
    : ordered;
  const pinnedCount = visibleIds.filter((id) => byId.get(id)?.pinned).length;

  const setVisible = (visible: string[]) => onPrefsChange({ ...prefs, visible });

  const toggle = (column: AdminColumn<Row>, checked: boolean) => {
    if (column.pinned) return;
    setVisible(checked ? [...visibleIds, column.id] : visibleIds.filter((id) => id !== column.id));
  };

  const move = (id: string, toIndex: number) => {
    const from = visibleIds.indexOf(id);
    const to = Math.max(pinnedCount, Math.min(visibleIds.length - 1, toIndex));
    if (from < pinnedCount || from === to) return;
    const next = [...visibleIds];
    next.splice(from, 1);
    next.splice(to, 0, id);
    setVisible(next);
  };

  const onRowKey = (event: KeyboardEvent, id: string) => {
    if (!event.altKey || (event.key !== "ArrowUp" && event.key !== "ArrowDown")) return;
    event.preventDefault();
    const from = visibleIds.indexOf(id);
    if (from < 0) return;
    move(id, from + (event.key === "ArrowUp" ? -1 : 1));
  };

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      width={300}
      shadow="md"
      radius={16}
      withinPortal
      trapFocus
      hideDetached={false}
    >
      <Popover.Target>
        <Button
          variant="default"
          size="compact-sm"
          h={height}
          fz={13}
          radius={12}
          aria-expanded={opened}
          onClick={() => setOpened((value) => !value)}
          style={{
            background: opened ? "var(--color-flag-soft)" : RAISED_BG,
            borderColor: opened ? "var(--color-flag)" : undefined,
            color: "var(--color-ink)",
          }}
        >
          Columns · {visibleIds.length} of {columns.length}
        </Button>
      </Popover.Target>
      <Popover.Dropdown
        p={0}
        style={{
          background: "var(--color-canvas)",
          border: DESK_HAIRLINE,
          boxShadow: "0 8px 24px 0 oklch(0.1 0.04 265 / 0.45)",
          overflow: "hidden",
        }}
      >
        <Box
          style={{
            height: 48,
            padding: "0 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box
            component="span"
            style={{
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--color-ink-muted)",
            }}
          >
            Columns
          </Box>
          <Button
            variant="transparent"
            size="compact-sm"
            fz={13}
            c="var(--color-flag)"
            onClick={() => setVisible(defaults.visible)}
          >
            Reset to defaults
          </Button>
        </Box>
        <Box style={{ padding: "0 14px 8px" }}>
          <TextInput
            aria-label="Find a column"
            placeholder="Find a column"
            size="xs"
            radius={12}
            value={find}
            onChange={(event) => setFind(event.currentTarget.value)}
            styles={{ input: { height: 30, fontSize: 13 } }}
          />
        </Box>
        <Box role="list" style={{ maxHeight: 360, overflowY: "auto" }}>
          {shown.map((column) => {
            const checked = visibleSet.has(column.id);
            const draggable = checked && !column.pinned;
            return (
              <Box
                role="listitem"
                key={column.id}
                tabIndex={0}
                data-column-id={column.id}
                draggable={draggable}
                onDragStart={() => draggable && setDragId(column.id)}
                onDragOver={(event) => {
                  if (dragId && checked) event.preventDefault();
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragId && checked) move(dragId, visibleIds.indexOf(column.id));
                  setDragId(null);
                }}
                onDragEnd={() => setDragId(null)}
                onKeyDown={(event: KeyboardEvent) => onRowKey(event, column.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 14px",
                  fontSize: 13,
                  color: checked ? "var(--color-ink)" : "var(--color-ink-muted)",
                  opacity: dragId === column.id ? 0.5 : 1,
                }}
              >
                <Checkbox
                  size="xs"
                  radius={5}
                  color="var(--color-flag)"
                  iconColor="var(--color-flag-ink)"
                  label={column.label}
                  checked={checked}
                  disabled={column.pinned}
                  onChange={(event) => toggle(column, event.currentTarget.checked)}
                />
                {column.pinned && (
                  <Box component="span" style={{ fontSize: 11, color: "var(--color-signal)" }}>
                    pinned
                  </Box>
                )}
                <Box
                  component="span"
                  aria-hidden="true"
                  style={{
                    marginLeft: "auto",
                    color: "var(--color-ink-muted)",
                    letterSpacing: "-2px",
                    cursor: draggable ? "grab" : "default",
                    visibility: draggable ? "visible" : "hidden",
                  }}
                >
                  ⋮⋮
                </Box>
              </Box>
            );
          })}
        </Box>
        <Box
          style={{
            padding: "8px 14px 12px",
            borderTop: DESK_HAIRLINE,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box component="span" style={{ fontSize: 12, color: "var(--color-ink-muted)" }}>
            Drag or Alt+arrows to reorder. Saved per browser.
          </Box>
          <Button
            size="compact-sm"
            h={30}
            radius={12}
            color="var(--color-flag)"
            c="var(--color-flag-ink)"
            onClick={() => setOpened(false)}
          >
            Done
          </Button>
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}
