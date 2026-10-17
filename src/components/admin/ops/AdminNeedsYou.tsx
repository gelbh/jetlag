import {
  Accordion,
  Alert,
  Checkbox,
  Group,
  List,
  Skeleton,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useEffect, useRef, useState } from "react";
import {
  INCIDENT_PROGRESS_LABEL,
  type IncidentProgress,
  incidentProgress,
} from "@/domain/admin/incidentProgress";
import type { IncidentRecord } from "@/domain/incident/incidentTypes";
import type { PreloadStatusChipTone } from "@/domain/preloadRequest/preloadRequestAdmin";
import type {
  PreloadRequest,
  PreloadRequestStatus,
} from "@/domain/preloadRequest/preloadRequestTypes";
import { useFreshnessClock } from "@/hooks/time/useFreshnessClock";
import { formatIncidentQueueId, incidentStatusChipLabel } from "@/services/admin/adminIncidents";
import {
  preloadRequestStatusChipLabel,
  preloadRequestStatusChipTone,
} from "@/services/admin/adminPreloadRequests";
import { incidentProgressTone, type StatusTone } from "@/theme/adminTone";
import { AdminIncidentActions } from "../incident/AdminIncidentActions";
import { AdminIncidentDetail } from "../incident/AdminIncidentDetail";
import { AdminEmptyState } from "../shared/AdminEmptyState";
import { DrillIn } from "../shared/DrillIn";
import { PunchTime } from "../shared/PunchTime";
import { SessionCode } from "../shared/SessionCode";
import { StatusMark } from "../shared/StatusMark";
import { AdminPreloadRequestDetail } from "./AdminPreloadRequestDetail";

export type NeedsYouGroup = "incidents" | "preload";

const CLOSED_PRELOAD = new Set<PreloadRequestStatus>(["declined", "shipped"]);

const PRELOAD_TONE: Record<PreloadStatusChipTone, StatusTone> = {
  open: "mispunch",
  active: "live",
  warning: "neutral",
  muted: "ok",
};

const PROGRESS_ORDER: IncidentProgress[] = [
  "new",
  "diagnosed",
  "fix_proposed",
  "resolved_today",
  "closed",
];

function incidentSummary(incident: IncidentRecord): string {
  return (
    incident.playerNote?.trim() || incident.posthogIssue?.name || formatIncidentQueueId(incident.id)
  );
}

export function AdminNeedsYou({
  incidents,
  incidentsLoading,
  incidentsError,
  selectedIncidentId,
  selectedIncident,
  onSelectIncident,
  onBackFromIncident,
  preloadRequests,
  preloadLoading,
  preloadError,
  selectedPreload,
  onSelectPreload,
  openGroups,
  onOpenGroupsChange,
}: {
  incidents: readonly IncidentRecord[];
  incidentsLoading: boolean;
  incidentsError: string | null;
  selectedIncidentId: string | null;
  selectedIncident: IncidentRecord | null;
  onSelectIncident: (incidentId: string) => void;
  onBackFromIncident: () => void;
  preloadRequests: readonly PreloadRequest[];
  preloadLoading: boolean;
  preloadError: string | null;
  selectedPreload: PreloadRequest | null;
  onSelectPreload: (requestId: string | null) => void;
  openGroups: NeedsYouGroup[];
  onOpenGroupsChange: (groups: NeedsYouGroup[]) => void;
}) {
  const [showClosed, setShowClosed] = useState(false);
  const [showClosedPreload, setShowClosedPreload] = useState(false);
  const queueRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLButtonElement>(null);
  const preloadQueueRef = useRef<HTMLDivElement>(null);
  const preloadControlRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<{ group: NeedsYouGroup; id: string } | null>(null);
  const lastPreloadIdRef = useRef<string | null>(null);
  const selectedPreloadId = selectedPreload?.id ?? null;
  const drilledIn = selectedIncidentId != null || selectedPreloadId != null;

  useEffect(() => {
    const previous = lastPreloadIdRef.current;
    lastPreloadIdRef.current = selectedPreloadId;
    if (previous && !selectedPreloadId) {
      returnFocusRef.current = { group: "preload", id: previous };
    }
  }, [selectedPreloadId]);

  useEffect(() => {
    const target = returnFocusRef.current;
    if (drilledIn || !target) return;
    returnFocusRef.current = null;
    const [queue, control, attr] =
      target.group === "incidents"
        ? [queueRef, controlRef, "data-incident-id"]
        : [preloadQueueRef, preloadControlRef, "data-preload-id"];
    const row = queue.current?.querySelector<HTMLElement>(`[${attr}="${CSS.escape(target.id)}"]`);
    (row ?? control.current)?.focus();
  }, [drilledIn]);

  if (selectedIncidentId) {
    const back = () => {
      returnFocusRef.current = { group: "incidents", id: selectedIncidentId };
      onBackFromIncident();
    };
    return (
      <DrillIn title={formatIncidentQueueId(selectedIncidentId)} onBack={back}>
        <AdminIncidentDetail incidentId={selectedIncidentId} />
        <AdminIncidentActions
          key={selectedIncidentId}
          incidentId={selectedIncidentId}
          status={selectedIncident?.status ?? null}
          sessionCode={selectedIncident?.sessionCode ?? null}
          agent={selectedIncident?.agent ?? null}
        />
      </DrillIn>
    );
  }

  if (selectedPreload) {
    return (
      <DrillIn title={selectedPreload.presetSnapshot.name} onBack={() => onSelectPreload(null)}>
        <Group gap="xs">
          <StatusMark
            tone={PRELOAD_TONE[preloadRequestStatusChipTone(selectedPreload.status)]}
            label={preloadRequestStatusChipLabel(selectedPreload.status)}
          />
          <PunchTime at={selectedPreload.updatedAt} flashing={false} />
        </Group>
        <AdminPreloadRequestDetail key={selectedPreload.id} request={selectedPreload} />
      </DrillIn>
    );
  }

  return (
    <Accordion
      multiple
      value={openGroups}
      onChange={(groups) => onOpenGroupsChange(groups as NeedsYouGroup[])}
    >
      <Accordion.Item value="incidents">
        <Accordion.Control ref={controlRef}>Incidents</Accordion.Control>
        <Accordion.Panel ref={queueRef}>
          <IncidentQueue
            incidents={incidents}
            loading={incidentsLoading}
            error={incidentsError}
            onSelect={onSelectIncident}
            showClosed={showClosed}
            onShowClosedChange={setShowClosed}
          />
        </Accordion.Panel>
      </Accordion.Item>
      <Accordion.Item value="preload">
        <Accordion.Control ref={preloadControlRef}>Preload requests</Accordion.Control>
        <Accordion.Panel ref={preloadQueueRef}>
          <PreloadQueue
            requests={preloadRequests}
            loading={preloadLoading}
            error={preloadError}
            onSelect={onSelectPreload}
            showClosed={showClosedPreload}
            onShowClosedChange={setShowClosedPreload}
          />
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
}

function PreloadQueue({
  requests,
  loading,
  error,
  onSelect,
  showClosed,
  onShowClosedChange,
}: {
  requests: readonly PreloadRequest[];
  loading: boolean;
  error: string | null;
  onSelect: (requestId: string) => void;
  showClosed: boolean;
  onShowClosedChange: (showClosed: boolean) => void;
}) {
  const rows = showClosed
    ? requests
    : requests.filter((request) => !CLOSED_PRELOAD.has(request.status));

  return (
    <Stack gap="sm">
      {error ? (
        <Alert role="alert" title="Couldn't load preload requests" data-tone="mispunch">
          {error}
        </Alert>
      ) : null}
      <Checkbox
        size="xs"
        label="Show closed"
        checked={showClosed}
        onChange={(event) => onShowClosedChange(event.currentTarget.checked)}
      />
      {loading && requests.length === 0 && !error ? (
        <Stack gap="xs" aria-busy="true">
          <Skeleton height={40} />
          <Skeleton height={40} />
        </Stack>
      ) : null}
      {!loading && !error && rows.length === 0 ? (
        <AdminEmptyState
          title={requests.length > 0 ? "No open preload requests" : "No preload requests"}
          body={
            requests.length > 0
              ? "Turn on Show closed to see shipped and declined requests."
              : "Preload requests from players appear here when they submit one."
          }
        />
      ) : null}
      {rows.length > 0 ? (
        <List listStyleType="none" size="sm">
          {rows.map((request) => (
            <li key={request.id}>
              <UnstyledButton
                type="button"
                w="100%"
                mih={44}
                py={6}
                data-preload-id={request.id}
                onClick={() => onSelect(request.id)}
              >
                <Group gap="xs" wrap="nowrap">
                  <Text component="span" size="sm" lineClamp={1} flex={1}>
                    {request.presetSnapshot.name}
                  </Text>
                  <StatusMark
                    tone={PRELOAD_TONE[preloadRequestStatusChipTone(request.status)]}
                    label={preloadRequestStatusChipLabel(request.status)}
                  />
                  <PunchTime at={request.updatedAt} flashing={false} />
                </Group>
              </UnstyledButton>
            </li>
          ))}
        </List>
      ) : null}
    </Stack>
  );
}

function IncidentQueue({
  incidents,
  loading,
  error,
  onSelect,
  showClosed,
  onShowClosedChange,
}: {
  incidents: readonly IncidentRecord[];
  loading: boolean;
  error: string | null;
  onSelect: (incidentId: string) => void;
  showClosed: boolean;
  onShowClosedChange: (showClosed: boolean) => void;
}) {
  const nowMs = useFreshnessClock();

  const groups = PROGRESS_ORDER.filter((progress) => showClosed || progress !== "closed")
    .map((progress) => ({
      progress,
      rows: incidents.filter((incident) => incidentProgress(incident, nowMs) === progress),
    }))
    .filter((group) => group.rows.length > 0);

  return (
    <Stack gap="sm">
      {error ? (
        <Alert role="alert" title="Queue error" data-tone="mispunch">
          {error}
        </Alert>
      ) : null}
      <Checkbox
        size="xs"
        label="Show closed"
        checked={showClosed}
        onChange={(event) => onShowClosedChange(event.currentTarget.checked)}
      />
      {loading && incidents.length === 0 && !error ? (
        <Stack gap="xs" aria-busy="true">
          <Skeleton height={40} />
          <Skeleton height={40} />
        </Stack>
      ) : null}
      {!loading && !error && groups.length === 0 ? (
        <AdminEmptyState
          title="No incidents"
          body={
            showClosed
              ? "No reports match this filter."
              : "Player reports appear here when submitted."
          }
        />
      ) : null}
      {groups.map(({ progress, rows }) => (
        <Stack key={progress} gap={4}>
          <Text size="xs" fw={600} c="dimmed">
            {INCIDENT_PROGRESS_LABEL[progress]}
          </Text>
          <List listStyleType="none" size="sm" aria-label={INCIDENT_PROGRESS_LABEL[progress]}>
            {rows.map((incident) => (
              <li key={incident.id}>
                <UnstyledButton
                  type="button"
                  w="100%"
                  mih={44}
                  py={6}
                  data-incident-id={incident.id}
                  onClick={() => onSelect(incident.id)}
                >
                  <Group gap="xs" wrap="nowrap">
                    {incident.sessionCode?.trim() ? (
                      <SessionCode code={incident.sessionCode.trim().toUpperCase()} size="sm" />
                    ) : null}
                    <Text component="span" size="sm" lineClamp={1} flex={1}>
                      {incidentSummary(incident)}
                    </Text>
                    <StatusMark
                      tone={incidentProgressTone[progress]}
                      label={incidentStatusChipLabel(incident.status)}
                    />
                    <PunchTime at={incident.updatedAt || incident.createdAt} flashing={false} />
                  </Group>
                </UnstyledButton>
              </li>
            ))}
          </List>
        </Stack>
      ))}
    </Stack>
  );
}
