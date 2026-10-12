import {
  Accordion,
  Alert,
  Checkbox,
  Group,
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
import { useFreshnessClock } from "@/hooks/time/useFreshnessClock";
import { formatIncidentQueueId, incidentStatusChipLabel } from "@/services/admin/adminIncidents";
import type { StatusTone } from "@/theme/adminTone";
import { AdminIncidentActions } from "../incident/AdminIncidentActions";
import { AdminIncidentDetail } from "../incident/AdminIncidentDetail";
import { AdminEmptyState } from "../shared/AdminEmptyState";
import { DrillIn } from "../shared/DrillIn";
import { PunchTime } from "../shared/PunchTime";
import { SessionCode } from "../shared/SessionCode";
import { StatusMark } from "../shared/StatusMark";

export type NeedsYouGroup = "incidents" | "preload";

const PROGRESS_ORDER: IncidentProgress[] = [
  "new",
  "diagnosed",
  "fix_proposed",
  "resolved_today",
  "closed",
];

const PROGRESS_TONE: Record<IncidentProgress, StatusTone> = {
  new: "mispunch",
  diagnosed: "info",
  fix_proposed: "live",
  resolved_today: "ok",
  closed: "neutral",
};

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
  openGroups: NeedsYouGroup[];
  onOpenGroupsChange: (groups: NeedsYouGroup[]) => void;
}) {
  const [showClosed, setShowClosed] = useState(false);
  const queueRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLButtonElement>(null);
  const returnFocusIdRef = useRef<string | null>(null);

  useEffect(() => {
    const incidentId = returnFocusIdRef.current;
    if (selectedIncidentId || !incidentId) return;
    returnFocusIdRef.current = null;
    const row = queueRef.current?.querySelector<HTMLElement>(
      `[data-incident-id="${CSS.escape(incidentId)}"]`,
    );
    (row ?? controlRef.current)?.focus();
  }, [selectedIncidentId]);

  if (selectedIncidentId) {
    const back = () => {
      returnFocusIdRef.current = selectedIncidentId;
      onBackFromIncident();
    };
    return (
      <DrillIn title={formatIncidentQueueId(selectedIncidentId)} onBack={back}>
        <AdminIncidentDetail incidentId={selectedIncidentId} />
        <AdminIncidentActions
          incidentId={selectedIncidentId}
          status={selectedIncident?.status ?? null}
          agent={selectedIncident?.agent ?? null}
        />
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
    </Accordion>
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
          <Stack component="ul" gap={0} aria-label={INCIDENT_PROGRESS_LABEL[progress]} m={0} p={0}>
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
                      tone={PROGRESS_TONE[progress]}
                      label={incidentStatusChipLabel(incident.status)}
                    />
                    <PunchTime at={incident.updatedAt || incident.createdAt} flashing={false} />
                  </Group>
                </UnstyledButton>
              </li>
            ))}
          </Stack>
        </Stack>
      ))}
    </Stack>
  );
}
