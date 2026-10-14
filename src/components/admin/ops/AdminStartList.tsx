import {
  Alert,
  Box,
  Button,
  Group,
  Kbd,
  ScrollArea,
  Skeleton,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { type ReactNode, useRef, useState } from "react";
import type {
  AdminSessionModeFilter,
  AdminSessionSort,
  AdminSessionStateChip,
} from "../../../domain/admin/adminSessionFilters";
import { filterAdminSessions } from "../../../domain/admin/adminSessionFilters";
import { usePunchFlash } from "../../../hooks/admin/usePunchFlash";
import type { AdminSessionSummary } from "../../../services/admin/adminSessions";
import { AdminEmptyState } from "../shared/AdminEmptyState";
import { AdminRegion } from "../shared/AdminRegion";
import { AdminSessionFilters } from "./AdminSessionFilters";
import { AdminSessionRow } from "./AdminSessionRow";

interface AdminStartListProps {
  sessions: AdminSessionSummary[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: string | null;
  onLoadMore: () => void;
  observingCode: string | null;
  joinError: string | null;
  monitoredSessionId: string | null;
  mispunchBySession: ReadonlyMap<string, number>;
  onMonitor: (summary: AdminSessionSummary) => void;
}

export const START_LIST_GRID_CELLS = 10;

function dialogIsOpen() {
  return (
    document.activeElement?.closest('[role="dialog"]') != null ||
    document.querySelector('[aria-modal="true"]') != null
  );
}

export function AdminStartList({
  sessions,
  loading,
  error,
  onRetry,
  hasMore,
  loadingMore,
  loadMoreError,
  onLoadMore,
  observingCode,
  joinError,
  monitoredSessionId,
  mispunchBySession,
  onMonitor,
}: AdminStartListProps) {
  const [query, setQuery] = useState("");
  const [liveOnly, setLiveOnly] = useState(true);
  const [annotatedOnly, setAnnotatedOnly] = useState(false);
  const [modeFilter, setModeFilter] = useState<AdminSessionModeFilter>("all");
  const [stateFilter, setStateFilter] = useState<AdminSessionStateChip>(null);
  const [sort, setSort] = useState<AdminSessionSort>("lastActivity");
  const [cursorId, setCursorId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const flashing = usePunchFlash(sessions);

  const filteredSessions = filterAdminSessions(sessions, {
    query,
    liveOnly,
    annotatedOnly,
    mode: modeFilter,
    state: stateFilter,
    sort,
  });
  const cursorIndex =
    cursorId == null ? -1 : filteredSessions.findIndex((row) => row.sessionId === cursorId);
  if (cursorId != null && cursorIndex === -1) {
    setCursorId(null);
  }

  const moveCursor = (delta: 1 | -1) => {
    if (filteredSessions.length === 0) return;
    const next = Math.min(Math.max(cursorIndex + delta, 0), filteredSessions.length - 1);
    setCursorId(filteredSessions[next].sessionId);
    tableRef.current?.tBodies[0]?.rows[next]?.querySelector("button")?.focus();
  };

  // Not default-prevented up front: a dialog keeps its own `/`, `j` and `k` keystrokes.
  const unlessDialog = (event: KeyboardEvent, run: () => void) => {
    if (dialogIsOpen()) return;
    event.preventDefault();
    run();
  };
  const passive = { preventDefault: false };

  useHotkeys([
    ["/", (event) => unlessDialog(event, () => searchRef.current?.focus()), passive],
    ["j", (event) => unlessDialog(event, () => moveCursor(1)), passive],
    ["k", (event) => unlessDialog(event, () => moveCursor(-1)), passive],
  ]);

  const loadMoreButton = hasMore ? (
    <Stack gap="xs">
      {loadMoreError ? (
        <Alert role="alert" data-tone="mispunch" title="Couldn't load more sessions">
          <Stack gap="xs" align="flex-start">
            <Text size="sm">{loadMoreError}</Text>
            <Button
              type="button"
              variant="default"
              size="compact-sm"
              disabled={loadingMore}
              onClick={onLoadMore}
            >
              Retry
            </Button>
          </Stack>
        </Alert>
      ) : null}
      <Button type="button" variant="default" fullWidth disabled={loadingMore} onClick={onLoadMore}>
        {loadingMore ? "Loading…" : "Load more sessions"}
      </Button>
    </Stack>
  ) : null;

  const errorAlert = error ? (
    <Alert role="alert" data-tone="mispunch" title="Couldn't load sessions">
      <Stack gap="xs" align="flex-start">
        <Text size="sm">{error}</Text>
        <Button type="button" variant="default" size="compact-sm" onClick={onRetry}>
          Retry
        </Button>
      </Stack>
    </Alert>
  ) : null;

  const joinAlert = joinError ? (
    <Alert role="alert" data-tone="mispunch" title="Couldn't monitor">
      {joinError}
    </Alert>
  ) : null;

  // Fail-only when nothing is retained; keep filters and rows when refresh or load more fails.
  const failedEmpty = errorAlert != null && sessions.length === 0;

  let listBody: ReactNode;
  if (loading) {
    listBody = (
      <Stack gap={0} aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} height="var(--adm-cell)" radius={0} />
        ))}
      </Stack>
    );
  } else if (sessions.length === 0) {
    listBody = (
      <AdminEmptyState
        title={liveOnly ? "No live sessions" : "No sessions"}
        body="Games appear here while a host session is active."
      />
    );
  } else if (filteredSessions.length === 0) {
    listBody = (
      <AdminEmptyState
        title="No matching sessions"
        body="Try another code, area name, or phase filter."
        action={loadMoreButton}
      />
    );
  } else {
    listBody = (
      <>
        <Table ref={tableRef} layout="fixed" w={`calc(var(--adm-cell) * ${START_LIST_GRID_CELLS})`}>
          <colgroup>
            {Array.from({ length: START_LIST_GRID_CELLS }, (_, index) => (
              <Box key={index} component="col" w="var(--adm-cell)" />
            ))}
          </colgroup>
          <Table.Thead>
            <Table.Tr>
              <Table.Th colSpan={2}>Course</Table.Th>
              <Table.Th colSpan={4}>Phase</Table.Th>
              <Table.Th>
                <abbr title="Runners">Rn</abbr>
              </Table.Th>
              <Table.Th colSpan={2}>
                <abbr title="Last punch">Last</abbr>
              </Table.Th>
              <Table.Th>
                <abbr title="Mispunches">MP</abbr>
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredSessions.map((summary) => (
              <AdminSessionRow
                key={summary.sessionId}
                summary={summary}
                observingCode={observingCode}
                monitored={monitoredSessionId === summary.sessionId}
                cursor={cursorId === summary.sessionId}
                flashing={flashing.has(summary.sessionId)}
                mispunchCount={mispunchBySession.get(summary.sessionId) ?? 0}
                onMonitor={onMonitor}
              />
            ))}
          </Table.Tbody>
        </Table>
        {loadMoreButton}
      </>
    );
  }

  return (
    <AdminRegion
      title="Start list"
      scroll={false}
      data-testid="admin-ops-sessions"
      actions={
        <Tooltip label="Move between rows">
          <Group gap={4} wrap="nowrap">
            <Kbd>j</Kbd>
            <Kbd>k</Kbd>
          </Group>
        </Tooltip>
      }
      error={
        failedEmpty ? (
          <Stack gap="sm">
            {joinAlert}
            {errorAlert}
          </Stack>
        ) : null
      }
    >
      <Stack gap="sm" flex={1} mih={0}>
        {joinAlert}
        {errorAlert}
        <AdminSessionFilters
          query={query}
          liveOnly={liveOnly}
          annotatedOnly={annotatedOnly}
          mode={modeFilter}
          state={stateFilter}
          sort={sort}
          searchRef={searchRef}
          onQueryChange={setQuery}
          onLiveOnlyChange={setLiveOnly}
          onAnnotatedOnlyChange={setAnnotatedOnly}
          onModeChange={setModeFilter}
          onStateChange={setStateFilter}
          onSortChange={setSort}
        />
        <ScrollArea flex={1} mih={0}>
          {listBody}
        </ScrollArea>
      </Stack>
    </AdminRegion>
  );
}
