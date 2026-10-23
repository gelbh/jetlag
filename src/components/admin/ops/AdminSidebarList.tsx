import { Box, Button } from "@mantine/core";
import { useEffect, useRef } from "react";
import { resolveAdminSessionAreaLabel } from "@/domain/admin/adminSessionAreaLabel";
import type { AdminTableTab } from "@/domain/admin/adminTablePrefs";
import { formatFreshnessAge } from "@/domain/admin/formatAdminFreshness";
import type { AdminSessionSummary } from "@/services/admin/adminSessions";
import { AdminRegion } from "../shared/AdminRegion";
import { RAISED_BG } from "../shared/adminSurface";
import { SessionCode } from "../shared/SessionCode";
import { StatusMark } from "../shared/StatusMark";
import { sortAdminRows } from "../table/AdminDataTable";
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

const FRESH_MS = 60_000;
const hairline = "0.5px solid color-mix(in oklch, var(--color-rule) 65%, transparent)";

function ItemShell({
  selected,
  label,
  onOpen,
  children,
}: {
  selected: boolean;
  label: string;
  onOpen(): void;
  children: React.ReactNode;
}) {
  return (
    <Box
      component="button"
      type="button"
      className="admin-unstyled-control"
      data-desk-row=""
      aria-current={selected ? "true" : undefined}
      aria-label={label}
      onClick={onOpen}
      style={{
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: "2px 10px",
        alignItems: "center",
        width: "100%",
        minHeight: 56,
        padding: "10px 14px",
        borderTop: hairline,
        cursor: "pointer",
        background: selected ? "var(--color-flag-soft)" : undefined,
        boxShadow: selected ? "inset 3px 0 0 var(--color-flag)" : undefined,
        fontSize: 14,
        color: "var(--color-ink-secondary)",
      }}
    >
      {children}
    </Box>
  );
}

const ellipsis = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  color: "var(--color-ink)",
  minWidth: 0,
} as const;

function ago(iso: string | null): { text: string; fresh: boolean } {
  const at = iso ? Date.parse(iso) : Number.NaN;
  return {
    text: iso ? formatFreshnessAge(iso) : "–",
    fresh: !Number.isNaN(at) && Date.now() - at < FRESH_MS,
  };
}

function Age({ iso }: { iso: string | null }) {
  const { text, fresh } = ago(iso);
  return (
    <Box
      component="span"
      style={{
        fontSize: 12,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        color: fresh ? "var(--color-flag)" : "var(--color-ink-muted)",
      }}
    >
      {fresh ? (
        <Box
          component="span"
          aria-hidden="true"
          style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-flag)" }}
        />
      ) : null}
      {text}
    </Box>
  );
}

function SessionItem({
  summary,
  selected,
  openIncidents,
  onOpen,
}: {
  summary: AdminSessionSummary;
  selected: boolean;
  openIncidents: number;
  onOpen(): void;
}) {
  const mark = sessionPhaseMark(summary);
  return (
    <ItemShell selected={selected} label={`Open session ${summary.code}`} onOpen={onOpen}>
      <SessionCode code={summary.code} />
      <Box component="span" style={ellipsis}>
        {resolveAdminSessionAreaLabel(summary) ?? "–"}
      </Box>
      <Age iso={summary.lastActivityAt} />
      <span />
      <Box
        component="span"
        style={{ gridColumn: "2 / 4", display: "flex", gap: 8, alignItems: "center" }}
      >
        <StatusMark tone={mark.tone} label={mark.label} />
        {openIncidents > 0 ? (
          <Box
            component="span"
            style={{
              height: 20,
              padding: "0 8px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              color: "var(--color-status-error)",
              background: "var(--color-halt-soft)",
            }}
          >
            {openIncidents}
          </Box>
        ) : null}
      </Box>
    </ItemShell>
  );
}

function NeedsItem({
  row,
  selected,
  onOpen,
}: {
  row: NeedsYouRow;
  selected: boolean;
  onOpen(): void;
}) {
  return (
    <ItemShell
      selected={selected}
      label={`Open ${row.kind === "incident" ? "incident" : "preload request"}: ${row.summary}`}
      onOpen={onOpen}
    >
      {row.code ? (
        <SessionCode code={row.code} />
      ) : (
        <Box component="span" style={{ color: "var(--color-ink-muted)" }}>
          –
        </Box>
      )}
      <Box component="span" style={ellipsis} title={row.summary}>
        {row.summary}
      </Box>
      <Age iso={row.createdAt} />
      <span />
      <Box
        component="span"
        style={{ gridColumn: "2 / 4", display: "flex", gap: 10, alignItems: "center" }}
      >
        <StatusMark tone={row.status.tone} label={row.status.label} />
        <Box component="span" style={{ fontSize: 12, color: "var(--color-flag)", fontWeight: 600 }}>
          {row.kind === "incident" ? "Incident" : "Preload"}
        </Box>
      </Box>
    </ItemShell>
  );
}

/** Comp `desk2` left column: 320px sidebar of rows with an Expand control. */
export function AdminSidebarList({
  tables,
  tab,
  onTabChange,
  list,
  needsLoading,
  needsError,
  openIncidentsBySession,
  selectedKey,
  onOpenSession,
  onOpenNeeds,
  onExpand,
}: {
  tables: AdminDeskTables;
  tab: AdminTableTab;
  onTabChange(tab: AdminTableTab): void;
  list: AdminSessionListState;
  needsLoading: boolean;
  needsError: string | null;
  openIncidentsBySession: ReadonlyMap<string, number>;
  selectedKey: string | null;
  onOpenSession(summary: AdminSessionSummary): void;
  onOpenNeeds(row: NeedsYouRow): void;
  onExpand(): void;
}) {
  const onSessions = tab === "sessions";
  const sessionPrefs = tables.sessionPrefs;
  const sortColumn = tables.sessionColumns.find((column) => column.id === sessionPrefs.sort?.id);
  const sessionRows = sessionPrefs.sort
    ? sortAdminRows(tables.sessionRows, sortColumn, sessionPrefs.sort.dir)
    : tables.sessionRows;
  const needsSort = tables.needsPrefs.sort;
  const needsRows = needsSort
    ? sortAdminRows(
        tables.needsRows,
        tables.needsColumns.find((column) => column.id === needsSort.id),
        needsSort.dir,
      )
    : tables.needsRows;
  const bodyRef = useRef<HTMLDivElement>(null);

  // The open row stays in view when the sidebar mounts or the selection moves.
  useEffect(() => {
    bodyRef.current
      ?.querySelector<HTMLElement>('[aria-current="true"]')
      ?.scrollIntoView?.({ block: "nearest" });
  }, [selectedKey, tab]);

  return (
    <Box style={{ width: 320, flex: "none", display: "flex", minHeight: 0 }}>
      <AdminRegion
        title={onSessions ? "Sessions" : "Needs you"}
        count={onSessions ? sessionRows.length : needsRows.length}
        scroll
        data-testid="admin-ops-sessions"
        actions={
          <Button
            type="button"
            variant="default"
            h={30}
            fz={13}
            radius={12}
            size="compact-sm"
            aria-label="Expand to table"
            title="Expand to table"
            style={{ background: RAISED_BG, color: "var(--color-ink)" }}
            onClick={onExpand}
          >
            Expand ⟩
          </Button>
        }
      >
        <Box ref={bodyRef}>
          <Box px={14} pb={10}>
            <DeskTabs
              tab={tab}
              onTabChange={onTabChange}
              sessionsCount={sessionRows.length}
              needsYouCount={tables.needsOpenCount}
              fullWidth
            />
          </Box>
          {onSessions ? (
            sessionRows.length === 0 ? (
              <SessionsEmpty tables={tables} list={list} />
            ) : (
              sessionRows.map((summary) => (
                <SessionItem
                  key={summary.sessionId}
                  summary={summary}
                  selected={selectedKey === summary.sessionId}
                  openIncidents={openIncidentsBySession.get(summary.sessionId) ?? 0}
                  onOpen={() => onOpenSession(summary)}
                />
              ))
            )
          ) : needsRows.length === 0 ? (
            <NeedsYouEmpty tables={tables} loading={needsLoading} error={needsError} />
          ) : (
            needsRows.map((row) => (
              <NeedsItem
                key={row.key}
                row={row}
                selected={selectedKey === row.key}
                onOpen={() => onOpenNeeds(row)}
              />
            ))
          )}
          {onSessions ? <LoadMore list={list} /> : null}
        </Box>
      </AdminRegion>
    </Box>
  );
}
