import { Alert, Box, Button, Skeleton, Stack } from "@mantine/core";
import { useState } from "react";
import type { AdminTableTab } from "../../../domain/admin/adminTablePrefs";
import type { IncidentRecord } from "../../../domain/incident/incidentTypes";
import type { PreloadRequest } from "../../../domain/preloadRequest/preloadRequestTypes";
import { isOpenIncident } from "../../../services/admin/adminIncidents";
import type { AdminSessionSummary } from "../../../services/admin/adminSessions";
import type { NeedsYouRow } from "../table/needsYouRows";
import { AdminCaseFile } from "./AdminCaseFile";
import { AdminDeskTable, type AdminSessionListState } from "./AdminDeskTable";
import { AdminPhoneList, AdminPhoneSession } from "./AdminPhoneDesk";
import { AdminRequestFile } from "./AdminRequestFile";
import { type AdminSessionMonitorState, AdminSessionView, EndedSession } from "./AdminSessionView";
import { AdminSidebarList } from "./AdminSidebarList";
import type { RouteKind } from "./adminDeskRoute";
import type { AdminDeskTables } from "./useAdminDeskTables";

export interface AdminOpsDeskRouteBag {
  isDesktop: boolean;
  pathname: string;
  routeKind: RouteKind;
  routeTab: AdminTableTab;
  collapsed: boolean;
  routeSessionId: string | null;
  routeIncidentId: string | null;
  routeRequestId: string | null;
  routeSession: AdminSessionSummary | null | undefined;
}

export interface AdminOpsDeskDataBag {
  tables: AdminDeskTables;
  list: AdminSessionListState;
  needsLoading: boolean;
  needsError: string | null;
  openIncidentsBySession: ReadonlyMap<string, number>;
  selectedKey: string | null;
  lastItemPath: string | null;
  selectedIncident: IncidentRecord | null;
  incidentLoading: boolean;
  selectedRequest: PreloadRequest | null;
  sessionById: (sessionId: string | null | undefined) => AdminSessionSummary | null;
  sessionsLoading: boolean;
  preloadLoading: boolean;
  enabled: boolean;
  hasMore: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  sessionsFailedEmpty: boolean;
  visibleIncidents: readonly IncidentRecord[];
}

export interface AdminOpsDeskMonitorBag {
  state: AdminSessionMonitorState;
  observeError: string | null;
  observingCode: string | null;
}

export interface AdminOpsDeskActionsBag {
  onOpenSession: (summary: Pick<AdminSessionSummary, "sessionId">) => void;
  onOpenNeeds: (row: NeedsYouRow) => void;
  onChangeTab: (tab: AdminTableTab) => void;
  onGoToTable: () => void;
  onWatchGame: (summary: AdminSessionSummary) => void;
  onNavigate: (path: string) => void;
  onRefresh: () => void;
  onLoadMore: () => void;
}

export function AdminOpsDeskBody({
  route,
  deskData,
  monitor,
  actions,
}: {
  route: AdminOpsDeskRouteBag;
  deskData: AdminOpsDeskDataBag;
  monitor: AdminOpsDeskMonitorBag;
  actions: AdminOpsDeskActionsBag;
}) {
  const {
    isDesktop,
    pathname,
    routeKind,
    routeTab,
    collapsed,
    routeSessionId,
    routeIncidentId,
    routeRequestId,
    routeSession,
  } = route;
  const {
    tables,
    list,
    needsLoading,
    needsError,
    openIncidentsBySession,
    selectedKey,
    lastItemPath,
    selectedIncident,
    incidentLoading,
    selectedRequest,
    sessionById,
    sessionsLoading,
    preloadLoading,
    enabled,
    hasMore,
    refreshing,
    loadingMore,
    sessionsFailedEmpty,
    visibleIncidents,
  } = deskData;
  const { state: monitorState, observeError, observingCode } = monitor;
  const {
    onOpenSession,
    onOpenNeeds,
    onChangeTab,
    onGoToTable,
    onWatchGame,
    onNavigate,
    onRefresh,
    onLoadMore,
  } = actions;

  const [sidebarTab, setSidebarTab] = useState<{ path: string; tab: AdminTableTab } | null>(null);

  const openIncidentForSession = (sessionId: string | null | undefined) =>
    sessionId
      ? visibleIncidents.find((row) => row.sessionId === sessionId && isOpenIncident(row))
      : undefined;

  const caseFile = routeIncidentId ? (
    <AdminCaseFile
      incidentId={routeIncidentId}
      incident={selectedIncident}
      loading={incidentLoading}
      session={sessionById(selectedIncident?.sessionId)}
      sessionsLoading={sessionsLoading}
      onWatch={onWatchGame}
      onBack={onGoToTable}
    />
  ) : null;
  const requestFile = routeRequestId ? (
    <AdminRequestFile
      request={selectedRequest}
      loading={enabled && preloadLoading}
      onBack={onGoToTable}
    />
  ) : null;

  if (isDesktop) {
    const sidebarRouteTab = sidebarTab?.path === pathname ? sidebarTab.tab : routeTab;
    let main: React.ReactNode = null;
    if (routeKind === "session") {
      const incident = openIncidentForSession(routeSessionId);
      main = (
        <AdminSessionView
          summary={routeSession ?? null}
          loading={sessionsLoading}
          openIncidentCount={routeSessionId ? (openIncidentsBySession.get(routeSessionId) ?? 0) : 0}
          onOpenIncident={() =>
            incident && onNavigate(`/admin/incidents/${encodeURIComponent(incident.id)}`)
          }
          onBack={onGoToTable}
          onRefresh={onRefresh}
          onLoadMore={onLoadMore}
          hasMore={hasMore}
          refreshing={refreshing}
          loadingMore={loadingMore}
          sessionsUnavailable={sessionsFailedEmpty}
          monitor={monitorState}
        />
      );
    } else if (routeKind === "incident") {
      main = caseFile;
    } else if (routeKind === "request") {
      main = requestFile;
    }
    return collapsed ? (
      <>
        <AdminSidebarList
          tables={tables}
          tab={sidebarRouteTab}
          onTabChange={(tab) => setSidebarTab({ path: pathname, tab })}
          list={list}
          needsLoading={needsLoading}
          needsError={needsError}
          openIncidentsBySession={openIncidentsBySession}
          selectedKey={selectedKey}
          onOpenSession={onOpenSession}
          onOpenNeeds={onOpenNeeds}
          onExpand={onGoToTable}
        />
        <Box style={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex" }}>{main}</Box>
      </>
    ) : (
      <AdminDeskTable
        tables={tables}
        tab={routeTab}
        onTabChange={onChangeTab}
        list={list}
        needsLoading={needsLoading}
        needsError={needsError}
        selectedKey={selectedKey}
        onOpenSession={onOpenSession}
        onOpenNeeds={onOpenNeeds}
        onCollapse={lastItemPath ? () => onNavigate(lastItemPath) : undefined}
      />
    );
  }

  if (collapsed) {
    let item: React.ReactNode = caseFile ?? requestFile;
    if (routeKind === "session") {
      item = routeSession ? (
        <AdminPhoneSession
          summary={routeSession}
          columns={tables.sessionColumns}
          visible={tables.sessionPrefs.visible}
          openIncidentCount={openIncidentsBySession.get(routeSession.sessionId) ?? 0}
          watching={observingCode === routeSession.code}
          onWatch={() => onWatchGame(routeSession)}
          onOpenIncident={() => {
            const incident = openIncidentForSession(routeSession.sessionId);
            if (incident) onNavigate(`/admin/incidents/${encodeURIComponent(incident.id)}`);
          }}
        />
      ) : sessionsLoading ? (
        <Skeleton height={160} radius={16} aria-hidden="true" />
      ) : (
        <EndedSession
          onBack={onGoToTable}
          onRefresh={onRefresh}
          onLoadMore={onLoadMore}
          hasMore={hasMore}
          refreshing={refreshing}
          loadingMore={loadingMore}
        />
      );
    }
    return (
      <Stack gap={10} p={10} flex={1} mih={0} style={{ overflow: "auto" }}>
        <Button type="button" variant="subtle" w="fit-content" mih={44} onClick={onGoToTable}>
          Back
        </Button>
        {observeError && routeKind === "session" ? (
          <Alert role="alert" color="halt" title="Couldn't monitor">
            {observeError}
          </Alert>
        ) : null}
        <Box style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: "none" }}>
          {item}
        </Box>
      </Stack>
    );
  }

  return (
    <AdminPhoneList
      tables={tables}
      tab={routeTab}
      onTabChange={onChangeTab}
      list={list}
      needsLoading={needsLoading}
      needsError={needsError}
      selectedKey={selectedKey}
      onOpenSession={onOpenSession}
      onOpenNeeds={onOpenNeeds}
    />
  );
}
