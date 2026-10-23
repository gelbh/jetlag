import { Alert, Box, Button, Group, Skeleton, Stack, Text } from "@mantine/core";
import { useEffect, useRef } from "react";
import type { AdminTableTab } from "@/domain/admin/adminTablePrefs";
import type { AdminSessionSummary } from "@/services/admin/adminSessions";
import { AdminRegion } from "../shared/AdminRegion";
import { AdminSegmented } from "../shared/AdminSegmented";
import { AdminColumnPicker } from "../table/AdminColumnPicker";
import { AdminDataTable } from "../table/AdminDataTable";
import { AdminTableToolbar, MenuChip, ToggleChip } from "../table/AdminTableToolbar";
import type { NeedsYouRow } from "../table/needsYouRows";
import type { AdminDeskTables } from "./useAdminDeskTables";

const PHASE_OPTIONS = [
  { value: "waiting", label: "Waiting" },
  { value: "hiding", label: "Hiding" },
  { value: "seek", label: "Seek" },
  { value: "end-game-pending", label: "End game pending" },
  { value: "end-game-active", label: "End game" },
];
const TIER_OPTIONS = [
  { value: "free", label: "Free" },
  { value: "premium", label: "Premium" },
];
const KIND_OPTIONS = [
  { value: "incident", label: "Incidents" },
  { value: "preload", label: "Preloads" },
];

export function DeskTabs({
  tab,
  onTabChange,
  sessionsCount,
  needsYouCount,
  fullWidth,
}: {
  tab: AdminTableTab;
  onTabChange(tab: AdminTableTab): void;
  sessionsCount: number;
  needsYouCount: number;
  fullWidth?: boolean;
}) {
  return (
    <AdminSegmented
      aria-label="Table view"
      value={tab}
      fullWidth={fullWidth}
      onChange={(value) => onTabChange(value === "needs-you" ? "needs-you" : "sessions")}
      data={[
        { value: "sessions", label: `Sessions ${sessionsCount}` },
        { value: "needs-you", label: "Needs you", badge: needsYouCount },
      ]}
    />
  );
}

export interface AdminSessionListState {
  sessions: readonly AdminSessionSummary[];
  loading: boolean;
  error: string | null;
  onRetry(): void;
  hasMore: boolean;
  loadingMore: boolean;
  loadMoreError: string | null;
  onLoadMore(): void;
}

export function LoadMore({ list }: { list: AdminSessionListState }) {
  if (!list.hasMore) return null;
  return (
    <Stack gap="xs" p={12}>
      {list.loadMoreError ? (
        <Alert role="alert" color="halt" title="Couldn't load more sessions">
          <Group gap="xs" wrap="nowrap">
            <Text size="sm">{list.loadMoreError}</Text>
            <Button
              type="button"
              variant="default"
              size="compact-sm"
              disabled={list.loadingMore}
              onClick={list.onLoadMore}
            >
              Retry
            </Button>
          </Group>
        </Alert>
      ) : null}
      <Button
        type="button"
        variant="default"
        fullWidth
        disabled={list.loadingMore}
        onClick={list.onLoadMore}
      >
        {list.loadingMore ? "Loading…" : "Load more sessions"}
      </Button>
    </Stack>
  );
}

function EmptyBlock({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <Stack gap={6} align="flex-start" p={20}>
      <Text fw={700} size="md" c="var(--color-ink)">
        {title}
      </Text>
      {body ? (
        <Text size="sm" c="var(--color-ink-muted)">
          {body}
        </Text>
      ) : null}
      {action}
    </Stack>
  );
}

/** What an empty Sessions tab says, by cause. Shared by the table and the phone cards. */
export function SessionsEmpty({
  tables,
  list,
}: {
  tables: AdminDeskTables;
  list: AdminSessionListState;
}) {
  if (list.loading) {
    return (
      <Stack gap={0} aria-hidden="true" data-testid="admin-sessions-loading">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} height={48} radius={0} />
        ))}
      </Stack>
    );
  }
  if (list.error && list.sessions.length === 0) {
    return (
      <Box p={16}>
        <Alert role="alert" color="halt" title="Couldn't load sessions">
          <Stack gap="xs" align="flex-start">
            <Text size="sm">{list.error}</Text>
            <Button type="button" variant="default" size="compact-sm" onClick={list.onRetry}>
              Retry
            </Button>
          </Stack>
        </Alert>
      </Box>
    );
  }
  if (tables.query.trim() !== "") {
    return (
      <EmptyBlock
        title="No sessions match"
        body="Try another code, area or host."
        action={
          <Button type="button" variant="default" onClick={tables.clearSearch}>
            Clear search
          </Button>
        }
      />
    );
  }
  if (tables.filtersActive) {
    return (
      <EmptyBlock
        title="No sessions match"
        body="No loaded session fits these filters."
        action={
          <Button type="button" variant="default" onClick={tables.clearChips}>
            Clear filters
          </Button>
        }
      />
    );
  }
  if (tables.liveOnly) {
    return (
      <EmptyBlock
        title="No live games right now"
        body="Games appear here while a host session is active."
        action={
          <Button type="button" variant="default" onClick={() => tables.setLiveOnly(false)}>
            Show all sessions
          </Button>
        }
      />
    );
  }
  return (
    <EmptyBlock title="No sessions" body="Games appear here while a host session is active." />
  );
}

export function NeedsYouEmpty({
  tables,
  loading,
  error,
}: {
  tables: AdminDeskTables;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <Stack gap={0} aria-hidden="true">
        {[0, 1].map((index) => (
          <Skeleton key={index} height={48} radius={0} />
        ))}
      </Stack>
    );
  }
  if (error) {
    return (
      <Box p={16}>
        <Alert role="alert" color="halt" title="Couldn't load the queue">
          {error}
        </Alert>
      </Box>
    );
  }
  return (
    <EmptyBlock
      title={tables.showClosed ? "Nothing to show" : "Nothing needs you"}
      body={
        tables.showClosed
          ? "No reports or requests match this filter."
          : "Open incidents and preload requests appear here. Turn on Show closed to see the rest."
      }
    />
  );
}

export function NeedsYouChips({ tables }: { tables: AdminDeskTables }) {
  return (
    <>
      <MenuChip
        name="Kind"
        value={tables.kind === "all" ? null : tables.kind}
        options={KIND_OPTIONS}
        onChange={(value) =>
          tables.setKind(value === "incident" || value === "preload" ? value : "all")
        }
      />
      <ToggleChip label="Show closed" on={tables.showClosed} onToggle={tables.setShowClosed} />
    </>
  );
}

interface AdminDeskTableProps {
  tables: AdminDeskTables;
  tab: AdminTableTab;
  onTabChange(tab: AdminTableTab): void;
  list: AdminSessionListState;
  needsLoading: boolean;
  needsError: string | null;
  selectedKey: string | null;
  onOpenSession(summary: AdminSessionSummary): void;
  onOpenNeeds(row: NeedsYouRow): void;
  onCollapse?(): void;
}

/** Comp "Sessions table", expanded: one full-width panel, toolbar then table. */
export function AdminDeskTable({
  tables,
  tab,
  onTabChange,
  list,
  needsLoading,
  needsError,
  selectedKey,
  onOpenSession,
  onOpenNeeds,
  onCollapse,
}: AdminDeskTableProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const onSessions = tab === "sessions";

  // Coming back from an open item: keep its row in view.
  useEffect(() => {
    rootRef.current
      ?.querySelector<HTMLElement>('tr[aria-current="true"]')
      ?.scrollIntoView?.({ block: "nearest" });
  }, [selectedKey, tab]);

  const tabs = (
    <DeskTabs
      tab={tab}
      onTabChange={onTabChange}
      sessionsCount={tables.sessionRows.length}
      needsYouCount={tables.needsOpenCount}
      fullWidth
    />
  );
  const prefs = tables.prefsFor(tab);

  return (
    <AdminRegion
      title={onSessions ? "Sessions" : "Needs you"}
      headerless
      scroll={false}
      data-testid="admin-ops-sessions"
    >
      <Stack ref={rootRef} gap={0} flex={1} mih={0} style={{ position: "relative" }}>
        {onSessions ? (
          <AdminTableToolbar
            tabs={tabs}
            query={tables.query}
            onQueryChange={tables.setQuery}
            liveOnly={tables.liveOnly}
            onLiveOnlyChange={tables.setLiveOnly}
            phase={tables.phase}
            phaseOptions={PHASE_OPTIONS}
            onPhaseChange={(value) =>
              tables.setPhase(
                PHASE_OPTIONS.find((o) => o.value === value) ? (value as never) : null,
              )
            }
            tier={tables.tier}
            tierOptions={TIER_OPTIONS}
            onTierChange={(value) =>
              tables.setTier(value === "free" || value === "premium" ? value : null)
            }
            hasIncident={tables.hasIncident}
            onHasIncidentChange={tables.setHasIncident}
            picker={
              <AdminColumnPicker
                columns={tables.sessionColumns}
                prefs={tables.sessionPrefs}
                defaults={tables.sessionDefaults}
                onPrefsChange={tables.setSessionPrefs}
              />
            }
            density={prefs.density}
            onDensityChange={(density) =>
              tables.setSessionPrefs({ ...tables.sessionPrefs, density })
            }
            onCollapse={onCollapse}
          />
        ) : (
          <AdminTableToolbar
            tabs={tabs}
            query={tables.query}
            onQueryChange={tables.setQuery}
            searchPlaceholder="Search code or summary"
            chips={<NeedsYouChips tables={tables} />}
            picker={
              <AdminColumnPicker
                columns={tables.needsColumns}
                prefs={tables.needsPrefs}
                defaults={tables.needsDefaults}
                onPrefsChange={tables.setNeedsPrefs}
              />
            }
            density={prefs.density}
            onDensityChange={(density) => tables.setNeedsPrefs({ ...tables.needsPrefs, density })}
            onCollapse={onCollapse}
          />
        )}
        {list.error && list.sessions.length > 0 && onSessions ? (
          <Box p={12}>
            <Alert role="alert" color="halt" title="Couldn't load sessions">
              <Group gap="xs" wrap="nowrap">
                <Text size="sm">{list.error}</Text>
                <Button type="button" variant="default" size="compact-sm" onClick={list.onRetry}>
                  Retry
                </Button>
              </Group>
            </Alert>
          </Box>
        ) : null}
        {onSessions ? (
          <AdminDataTable
            columns={tables.sessionColumns}
            rows={tables.sessionRows}
            rowKey={(row) => row.sessionId}
            prefs={tables.sessionPrefs}
            onPrefsChange={tables.setSessionPrefs}
            selectedKey={selectedKey}
            onOpen={onOpenSession}
            rowMuted={(row) => !row.isLive}
            empty={<SessionsEmpty tables={tables} list={list} />}
            footer={<LoadMore list={list} />}
          />
        ) : (
          <AdminDataTable
            columns={tables.needsColumns}
            rows={tables.needsRows}
            rowKey={(row) => row.key}
            prefs={tables.needsPrefs}
            onPrefsChange={tables.setNeedsPrefs}
            selectedKey={selectedKey}
            onOpen={onOpenNeeds}
            rowMuted={(row) => !row.open}
            empty={<NeedsYouEmpty tables={tables} loading={needsLoading} error={needsError} />}
          />
        )}
      </Stack>
    </AdminRegion>
  );
}
