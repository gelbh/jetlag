import { Box, Button, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { useState } from "react";
import { resolveAdminSessionAreaLabel } from "@/domain/admin/adminSessionAreaLabel";
import type { AdminTableTab } from "@/domain/admin/adminTablePrefs";
import type { AdminSessionSummary } from "@/services/admin/adminSessions";
import { DESK_HAIRLINE } from "../shared/adminSurface";
import { SessionCode } from "../shared/SessionCode";
import { StatusMark } from "../shared/StatusMark";
import { AdminColumnPicker } from "../table/AdminColumnPicker";
import type { AdminColumn } from "../table/AdminDataTable";
import { sortAdminRows } from "../table/AdminDataTable";
import { ToggleChip } from "../table/AdminTableToolbar";
import type { NeedsYouRow } from "../table/needsYouRows";
import { sessionPhaseMark } from "../table/sessionColumns";
import {
  type AdminSessionListState,
  DeskTabs,
  LoadMore,
  NeedsYouEmpty,
  SessionsEmpty,
} from "./AdminDeskTable";
import type { AdminDeskTables } from "./useAdminDeskTables";

const hairline = DESK_HAIRLINE;
const MAX_CARD_COLUMNS = 8;
const TOUCH = 44;

const lbl = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--color-ink-muted)",
} as const;

function Pairs<Row>({ columns, row }: { columns: AdminColumn<Row>[]; row: Row }) {
  return (
    <Box
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "6px 12px",
        padding: "10px 16px 14px",
      }}
    >
      {columns.map((column) => (
        <Box key={column.id} style={{ display: "grid", minWidth: 0 }}>
          <Box component="span" style={lbl}>
            {column.label}
          </Box>
          <Box
            component="span"
            style={{ color: "var(--color-ink)", fontWeight: 600, fontSize: 14 }}
          >
            {column.render(row)}
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function Card<Row>({
  columns,
  row,
  headerIds,
  label,
  selected,
  onOpen,
}: {
  columns: AdminColumn<Row>[];
  row: Row;
  headerIds: string[];
  label: string;
  selected: boolean;
  onOpen(): void;
}) {
  const [more, setMore] = useState(false);
  const chosen = columns.slice(0, MAX_CARD_COLUMNS);
  const extra = columns.slice(MAX_CARD_COLUMNS);
  const head = chosen.filter((column) => headerIds.includes(column.id));
  const body = chosen.filter((column) => !headerIds.includes(column.id));
  return (
    <Box
      component="li"
      style={{
        listStyle: "none",
        background: "var(--color-canvas)",
        border: hairline,
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: selected ? "inset 3px 0 0 var(--color-flag)" : undefined,
      }}
    >
      <UnstyledButton
        data-desk-row=""
        aria-label={label}
        aria-current={selected ? "true" : undefined}
        onClick={onOpen}
        style={{ display: "block", width: "100%", minHeight: TOUCH, textAlign: "left" }}
      >
        <Box
          style={{
            minHeight: 44,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 16px",
            fontSize: 14,
          }}
        >
          {head.map((column, index) => (
            <Box
              key={column.id}
              component="span"
              style={{
                color: "var(--color-ink)",
                marginLeft: index === head.length - 1 && index > 0 ? "auto" : undefined,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {column.render(row)}
            </Box>
          ))}
        </Box>
        <Pairs columns={body} row={row} />
      </UnstyledButton>
      {extra.length > 0 ? (
        <>
          {more ? <Pairs columns={extra} row={row} /> : null}
          <Button
            type="button"
            variant="subtle"
            fullWidth
            mih={TOUCH}
            aria-expanded={more}
            onClick={() => setMore((value) => !value)}
          >
            {more ? "Fewer" : "More"}
          </Button>
        </>
      ) : null}
    </Box>
  );
}

function visibleColumns<Row>(columns: AdminColumn<Row>[], visible: string[]): AdminColumn<Row>[] {
  const byId = new Map(columns.map((column) => [column.id, column]));
  return visible.flatMap((id) => byId.get(id) ?? []);
}

/** Comp `phone()`: segmented tabs and Columns, then one card per row. */
export function AdminPhoneList({
  tables,
  tab,
  onTabChange,
  list,
  needsLoading,
  needsError,
  selectedKey,
  onOpenSession,
  onOpenNeeds,
}: {
  tables: AdminDeskTables;
  tab: AdminTableTab;
  onTabChange(tab: AdminTableTab): void;
  list: AdminSessionListState;
  needsLoading: boolean;
  needsError: string | null;
  selectedKey: string | null;
  onOpenSession(summary: AdminSessionSummary): void;
  onOpenNeeds(row: NeedsYouRow): void;
}) {
  const onSessions = tab === "sessions";
  const sessionCols = visibleColumns(tables.sessionColumns, tables.sessionPrefs.visible);
  const needsCols = visibleColumns(tables.needsColumns, tables.needsPrefs.visible);
  const sessionSort = tables.sessionPrefs.sort;
  const sessionRows = sessionSort
    ? sortAdminRows(
        tables.sessionRows,
        tables.sessionColumns.find((column) => column.id === sessionSort.id),
        sessionSort.dir,
      )
    : tables.sessionRows;
  const needsSort = tables.needsPrefs.sort;
  const needsRows = needsSort
    ? sortAdminRows(
        tables.needsRows,
        tables.needsColumns.find((column) => column.id === needsSort.id),
        needsSort.dir,
      )
    : tables.needsRows;

  return (
    <Stack gap={10} p={10} flex={1} mih={0} style={{ overflow: "auto" }}>
      <Box style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <DeskTabs
            tab={tab}
            onTabChange={onTabChange}
            sessionsCount={tables.sessionRows.length}
            needsYouCount={tables.needsOpenCount}
            fullWidth
          />
        </Box>
        {onSessions ? (
          <AdminColumnPicker
            columns={tables.sessionColumns}
            prefs={tables.sessionPrefs}
            defaults={tables.sessionDefaults}
            onPrefsChange={tables.setSessionPrefs}
            height={TOUCH}
          />
        ) : (
          <AdminColumnPicker
            columns={tables.needsColumns}
            prefs={tables.needsPrefs}
            defaults={tables.needsDefaults}
            onPrefsChange={tables.setNeedsPrefs}
            height={TOUCH}
          />
        )}
      </Box>
      <Box style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <TextInput
          aria-label="Search sessions"
          placeholder={onSessions ? "Search code, area or host" : "Search code or summary"}
          radius={12}
          style={{ flex: 1 }}
          value={tables.query}
          onChange={(event) => tables.setQuery(event.currentTarget.value)}
          styles={{ input: { height: TOUCH, minHeight: TOUCH } }}
        />
        {onSessions ? (
          <ToggleChip
            label="Live only"
            on={tables.liveOnly}
            onToggle={tables.setLiveOnly}
            height={TOUCH}
          />
        ) : (
          <ToggleChip
            label="Show closed"
            on={tables.showClosed}
            onToggle={tables.setShowClosed}
            height={TOUCH}
          />
        )}
      </Box>
      <Box component="ul" m={0} p={0} style={{ display: "grid", gap: 10 }}>
        {onSessions
          ? sessionRows.map((row) => (
              <Card
                key={row.sessionId}
                columns={sessionCols}
                row={row}
                headerIds={["code", "area", "phase"]}
                label={`Open session ${row.code}`}
                selected={selectedKey === row.sessionId}
                onOpen={() => onOpenSession(row)}
              />
            ))
          : needsRows.map((row) => (
              <Card
                key={row.key}
                columns={needsCols}
                row={row}
                headerIds={["code", "summary", "status"]}
                label={`Open ${row.kind === "incident" ? "incident" : "preload request"}: ${row.summary}`}
                selected={selectedKey === row.key}
                onOpen={() => onOpenNeeds(row)}
              />
            ))}
      </Box>
      {onSessions && sessionRows.length === 0 ? (
        <SessionsEmpty tables={tables} list={list} />
      ) : null}
      {!onSessions && needsRows.length === 0 ? (
        <NeedsYouEmpty tables={tables} loading={needsLoading} error={needsError} />
      ) : null}
      {onSessions ? <LoadMore list={list} /> : null}
    </Stack>
  );
}

/** A session opened full screen on a phone: the chosen facts, Watch game, Open incident. */
export function AdminPhoneSession({
  summary,
  columns,
  visible,
  openIncidentCount,
  watching,
  onWatch,
  onOpenIncident,
}: {
  summary: AdminSessionSummary;
  columns: AdminColumn<AdminSessionSummary>[];
  visible: string[];
  openIncidentCount: number;
  watching: boolean;
  onWatch(): void;
  onOpenIncident(): void;
}) {
  const mark = sessionPhaseMark(summary);
  const facts = visibleColumns(columns, visible).filter(
    (column) => !["code", "area", "phase"].includes(column.id),
  );
  return (
    <Stack
      gap={0}
      data-testid="admin-phone-session"
      style={{
        background: "var(--color-canvas)",
        border: hairline,
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <Box style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px" }}>
        <SessionCode code={summary.code} size="lg" />
        <Text component="span" c="var(--color-ink)" style={{ minWidth: 0 }} truncate>
          {resolveAdminSessionAreaLabel(summary) ?? "–"}
        </Text>
        <Box style={{ marginLeft: "auto" }}>
          <StatusMark tone={mark.tone} label={mark.label} />
        </Box>
      </Box>
      <Pairs columns={facts} row={summary} />
      <Stack gap={8} p={16} pt={4}>
        <Button type="button" h={TOUCH} radius={12} loading={watching} onClick={onWatch}>
          Watch game
        </Button>
        {openIncidentCount > 0 ? (
          <Button type="button" variant="default" h={TOUCH} radius={12} onClick={onOpenIncident}>
            Open incident
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}
