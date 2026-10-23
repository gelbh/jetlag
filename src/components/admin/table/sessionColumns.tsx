import { Box } from "@mantine/core";
import { resolveAdminSessionAreaLabel } from "@/domain/admin/adminSessionAreaLabel";
import { formatFreshnessAge } from "@/domain/admin/formatAdminFreshness";
import { adminSessionPhaseLabel, adminSessionTimerState } from "@/domain/admin/sessionPhase";
import { resolveHidingPeriodMinutes } from "@/domain/session/rules/deadlines";
import { formatClockDurationFromMs } from "@/domain/time/formatClockDuration";
import type { AdminSessionPhase, AdminSessionSummary } from "@/services/admin/adminSessions";
import type { StatusTone } from "@/theme/adminTone";
import { SessionCode } from "../shared/SessionCode";
import { StatusMark } from "../shared/StatusMark";
import type { AdminColumn } from "./AdminDataTable";

type Row = AdminSessionSummary;

export const SESSION_DEFAULT_SORT = { id: "lastActivity", dir: "desc" } as const;

const FRESH_MS = 60_000;
const DASH = "–";
const PHASE_ORDER: AdminSessionPhase[] = [
  "waiting",
  "hiding",
  "seek",
  "end-game-pending",
  "end-game-active",
];

export function sessionPhaseMark(row: Row): { tone: StatusTone; label: string } {
  return {
    tone: phaseTone(row),
    label: row.isLive ? adminSessionPhaseLabel(row.phase) : "Idle",
  };
}

function phaseTone(row: Row): StatusTone {
  if (!row.isLive) return "neutral";
  if (row.phase === "waiting") return "neutral";
  return row.phase === "hiding" || row.phase === "seek" ? "live" : "info";
}

function time(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

export function sessionElapsedMs(row: Row, now = Date.now()): number {
  const { accumulatedMs, runningSince } = adminSessionTimerState(row);
  return accumulatedMs + (runningSince == null ? 0 : Math.max(0, now - runningSince));
}

function hidingMinutes(row: Row): number {
  return resolveHidingPeriodMinutes({
    gameSize: row.gameSize,
    hidingPeriodMinutes: row.hidingPeriodMinutes ?? undefined,
  });
}

function questionCount(row: Row): number | null {
  return typeof row.questionCount === "number" ? row.questionCount : null;
}

function ageCell(iso: string | null) {
  return iso ? formatFreshnessAge(iso) : DASH;
}

function createdLabel(iso: string | null): string {
  const ms = time(iso);
  if (ms == null) return DASH;
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildSessionColumns(
  openIncidentsBySession: ReadonlyMap<string, number>,
): AdminColumn<Row>[] {
  return [
    {
      id: "code",
      label: "Code",
      defaultVisible: true,
      pinned: true,
      render: (row) => <SessionCode code={row.code} />,
      sortValue: (row) => row.code,
    },
    {
      id: "area",
      label: "Area",
      defaultVisible: true,
      render: (row) => resolveAdminSessionAreaLabel(row) ?? DASH,
      sortValue: (row) => resolveAdminSessionAreaLabel(row),
    },
    {
      id: "phase",
      label: "Phase",
      defaultVisible: true,
      render: (row) => {
        const mark = sessionPhaseMark(row);
        return <StatusMark tone={mark.tone} label={mark.label} />;
      },
      sortValue: (row) => PHASE_ORDER.indexOf(row.phase),
    },
    {
      id: "players",
      label: "Players (S / H)",
      defaultVisible: true,
      numeric: true,
      render: (row) => `${row.roleCounts.seeker} / ${row.roleCounts.hider}`,
      sortValue: (row) => row.roleCounts.seeker + row.roleCounts.hider,
    },
    {
      id: "clock",
      label: "Game clock",
      defaultVisible: true,
      numeric: true,
      render: (row) => formatClockDurationFromMs(sessionElapsedMs(row)),
      sortValue: (row) => sessionElapsedMs(row),
    },
    {
      id: "lastActivity",
      label: "Last activity",
      defaultVisible: true,
      render: (row) => {
        const at = time(row.lastActivityAt);
        const fresh = at != null && Date.now() - at < FRESH_MS;
        return (
          <Box
            component="span"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: fresh ? "var(--color-flag)" : undefined,
            }}
          >
            {fresh && (
              <Box
                component="span"
                data-testid="fresh-dot"
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--color-flag)",
                }}
              />
            )}
            {ageCell(row.lastActivityAt)}
          </Box>
        );
      },
      sortValue: (row) => time(row.lastActivityAt),
    },
    {
      id: "lastLocation",
      label: "Last location",
      defaultVisible: true,
      render: (row) => ageCell(row.lastLocationAt),
      sortValue: (row) => time(row.lastLocationAt),
    },
    {
      id: "openIncidents",
      label: "Open incidents",
      headerTitle: "Open incidents among the latest 50",
      defaultVisible: true,
      numeric: true,
      render: (row) => {
        const count = openIncidentsBySession.get(row.sessionId) ?? 0;
        return count > 0 ? (
          <Box
            component="span"
            style={{
              padding: "2px 8px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              color: "var(--color-status-error)",
              background: "var(--color-halt-soft)",
            }}
          >
            {count} open
          </Box>
        ) : (
          <Box component="span" style={{ color: "var(--color-ink-muted)" }}>
            0
          </Box>
        );
      },
      sortValue: (row) => openIncidentsBySession.get(row.sessionId) ?? 0,
    },
    {
      id: "tier",
      label: "Tier",
      defaultVisible: true,
      render: (row) => (
        <Box
          component="span"
          style={{
            color: row.tier === "premium" ? "var(--color-signal)" : "var(--color-ink-muted)",
          }}
        >
          {row.tier === "premium" ? "Premium" : "Free"}
        </Box>
      ),
      sortValue: (row) => row.tier,
    },
    {
      id: "questions",
      label: "Questions asked",
      defaultVisible: false,
      numeric: true,
      render: (row) => questionCount(row) ?? DASH,
      sortValue: (row) => questionCount(row),
    },
    {
      id: "size",
      label: "Game size",
      defaultVisible: false,
      render: (row) => row.gameSize.charAt(0).toUpperCase() + row.gameSize.slice(1),
      sortValue: (row) => ["small", "medium", "large"].indexOf(row.gameSize),
    },
    {
      id: "annotations",
      label: "Active annotations",
      defaultVisible: false,
      numeric: true,
      render: (row) => row.activeAnnotationCount,
      sortValue: (row) => row.activeAnnotationCount,
    },
    {
      id: "lastAnnotation",
      label: "Last annotation",
      defaultVisible: false,
      render: (row) => ageCell(row.lastAnnotationAt),
      sortValue: (row) => time(row.lastAnnotationAt),
    },
    {
      id: "hidingPeriod",
      label: "Hiding period",
      defaultVisible: false,
      numeric: true,
      render: (row) => `${hidingMinutes(row)} min`,
      sortValue: (row) => hidingMinutes(row),
    },
    {
      id: "mode",
      label: "Mode",
      defaultVisible: false,
      render: (row) => (row.mode === "multiplayer" ? "Multiplayer" : "Solo"),
      sortValue: (row) => row.mode,
    },
    {
      id: "regionPack",
      label: "Region pack",
      defaultVisible: false,
      render: (row) =>
        row.regionPackId
          ? [row.regionPackId, row.regionPackSubregionId].filter(Boolean).join(" / ")
          : DASH,
      sortValue: (row) => row.regionPackId,
    },
    {
      id: "transitMetro",
      label: "Transit metro",
      defaultVisible: false,
      render: (row) => row.transitMetroId ?? DASH,
      sortValue: (row) => row.transitMetroId,
    },
    {
      id: "appVersion",
      label: "Host app version",
      defaultVisible: false,
      render: (row) => row.hostAppVersion ?? DASH,
      sortValue: (row) => row.hostAppVersion,
    },
    {
      id: "created",
      label: "Created",
      defaultVisible: false,
      render: (row) => createdLabel(row.createdAt),
      sortValue: (row) => time(row.createdAt),
    },
  ];
}
