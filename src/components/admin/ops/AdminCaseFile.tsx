import { Box, Button, Skeleton, Stack, Text } from "@mantine/core";
import { resolveAdminSessionAreaLabel } from "@/domain/admin/adminSessionAreaLabel";
import { formatFreshnessAge } from "@/domain/admin/formatAdminFreshness";
import { incidentProgress } from "@/domain/admin/incidentProgress";
import type { IncidentRecord } from "@/domain/incident/incidentTypes";
import { useFreshnessClock } from "@/hooks/time/useFreshnessClock";
import { incidentStatusChipLabel } from "@/services/admin/adminIncidents";
import type { AdminSessionSummary } from "@/services/admin/adminSessions";
import { incidentProgressTone } from "@/theme/adminTone";
import { AdminIncidentActions } from "../incident/AdminIncidentActions";
import { AdminIncidentDetail } from "../incident/AdminIncidentDetail";
import { AdminRegion } from "../shared/AdminRegion";
import { DESK_HAIRLINE, RAISED_BG } from "../shared/adminSurface";
import { SessionCode } from "../shared/SessionCode";
import { StatusMark } from "../shared/StatusMark";
import { incidentSummary } from "../table/needsYouRows";
import { sessionPhaseMark } from "../table/sessionColumns";

const label = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--color-ink-muted)",
} as const;

function Fact({ name, value }: { name: string; value: string }) {
  return (
    <Box style={{ display: "grid" }}>
      <Box component="span" style={label}>
        {name}
      </Box>
      <Box component="span" style={{ fontWeight: 600, color: "var(--color-ink)" }}>
        {value}
      </Box>
    </Box>
  );
}

function titleCase(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
}

function reporterLine(incident: IncidentRecord): string {
  if (incident.posthogIssue) return "Raised by a PostHog alert";
  return `Reported by a ${incident.reporterRole ?? "player"}`;
}

function SessionCard({
  code,
  session,
  sessionsLoading,
  onWatch,
}: {
  code: string;
  session: AdminSessionSummary | null;
  sessionsLoading: boolean;
  onWatch(summary: AdminSessionSummary): void;
}) {
  return (
    <Box
      aria-label="Session"
      role="group"
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: "4px 18px",
        padding: "10px 12px",
        borderRadius: 12,
        background: "var(--color-surface-deep)",
        border: DESK_HAIRLINE,
      }}
    >
      <SessionCode code={code} size="md" />
      {session ? (
        <>
          <Box style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <Fact name="Area" value={resolveAdminSessionAreaLabel(session) ?? "–"} />
            <Fact name="Phase" value={sessionPhaseMark(session).label} />
            <Fact name="Players" value={String(session.memberCount)} />
            <Fact name="Last activity" value={formatFreshnessAge(session.lastActivityAt)} />
          </Box>
          <Button
            type="button"
            variant="default"
            h={36}
            radius={12}
            style={{ background: RAISED_BG, color: "var(--color-ink)" }}
            onClick={() => onWatch(session)}
          >
            Watch game
          </Button>
        </>
      ) : (
        <Text size="sm" c="var(--color-ink-muted)" style={{ gridColumn: "2 / 4" }}>
          {sessionsLoading ? "Checking the session…" : `${code} is no longer live`}
        </Text>
      )}
    </Box>
  );
}

export function AdminCaseFile({
  incidentId,
  incident,
  loading,
  session,
  sessionsLoading,
  onWatch,
  onBack,
}: {
  incidentId: string;
  incident: IncidentRecord | null;
  loading: boolean;
  session: AdminSessionSummary | null;
  sessionsLoading: boolean;
  onWatch(summary: AdminSessionSummary): void;
  onBack(): void;
}) {
  const nowMs = useFreshnessClock();

  if (!incident) {
    return (
      <AdminRegion title="Incident" headerless scroll={false} data-testid="admin-case-file">
        {loading ? (
          <Stack gap={12} p={20} aria-busy="true">
            <Skeleton height={20} width={240} />
            <Skeleton height={28} />
            <Skeleton height={56} />
          </Stack>
        ) : (
          <Stack gap={8} align="flex-start" p={20}>
            <Text fw={700} size="lg" c="var(--color-ink)">
              Incident not found
            </Text>
            <Text size="sm" c="var(--color-ink-muted)">
              It may have been removed, or the link is wrong.
            </Text>
            <Button type="button" variant="default" onClick={onBack}>
              Back to table
            </Button>
          </Stack>
        )}
      </AdminRegion>
    );
  }

  const progress = incidentProgress(incident, nowMs);
  const sessionCode = incident.sessionCode?.trim().toUpperCase() || null;

  return (
    <AdminRegion title="Incident" headerless scroll={false} data-testid="admin-case-file">
      <Stack
        gap={12}
        px={20}
        pt={18}
        pb={16}
        style={{ flex: "none", maxHeight: "60%", overflowY: "auto" }}
      >
        <Box style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 14px" }}>
          <Box
            component="span"
            style={{ color: "var(--color-flag)", fontSize: 13, fontWeight: 600 }}
          >
            Incident
          </Box>
          <StatusMark
            tone={incidentProgressTone[progress]}
            label={titleCase(incidentStatusChipLabel(incident.status))}
          />
          <Box component="span" style={{ color: "var(--color-ink-muted)" }}>
            {reporterLine(incident)} · {formatFreshnessAge(incident.createdAt)}
          </Box>
        </Box>
        <Box
          component="h2"
          m={0}
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
            color: "var(--color-ink)",
            textWrap: "balance",
            userSelect: "text",
          }}
        >
          {incident.playerNote?.trim()
            ? `“${incidentSummary(incident)}”`
            : incidentSummary(incident)}
        </Box>
        {sessionCode ? (
          <SessionCard
            code={sessionCode}
            session={session}
            sessionsLoading={sessionsLoading}
            onWatch={onWatch}
          />
        ) : null}
        <AdminIncidentActions
          key={incidentId}
          incidentId={incidentId}
          status={incident.status}
          sessionCode={incident.sessionCode ?? null}
          agent={incident.agent ?? null}
        />
      </Stack>
      <AdminIncidentDetail incidentId={incidentId} />
    </AdminRegion>
  );
}
