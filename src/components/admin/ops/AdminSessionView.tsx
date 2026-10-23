import { Box, Button, Menu, Skeleton, Stack, Text } from "@mantine/core";
import { resolveAdminSessionAreaLabel } from "@/domain/admin/adminSessionAreaLabel";
import { formatClockDurationFromMs } from "@/domain/time/formatClockDuration";
import { useAppNavigate } from "@/hooks/navigation/useAppNavigate";
import { adminModerateSession } from "@/services/admin/adminModeration";
import type { AdminSessionSummary } from "@/services/admin/adminSessions";
import { clearSessionLocalArtifacts } from "@/services/session/sessionCleanup";
import { useSessionStore } from "@/state/sessionStore";
import {
  type ModerationAction,
  useModerationConfirm,
} from "../../../routes/admin-map-screen/useModerationConfirm";
import { AdminMonitorPane } from "../monitor/AdminMonitorPane";
import { RAISED_BG } from "../shared/adminSurface";
import { SessionCode } from "../shared/SessionCode";
import { StatusMark } from "../shared/StatusMark";
import { sessionElapsedMs, sessionPhaseMark } from "../table/sessionColumns";

const hairline = "0.5px solid color-mix(in oklch, var(--color-rule) 65%, transparent)";

const raisedButton = { background: RAISED_BG, color: "var(--color-ink)" };

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export function EndedSession({ onBack }: { onBack(): void }) {
  return (
    <Stack
      gap={8}
      align="flex-start"
      p={20}
      style={{
        flex: 1,
        background: "var(--color-canvas)",
        border: hairline,
        borderRadius: 16,
      }}
    >
      <Text fw={700} size="lg" c="var(--color-ink)">
        This session has ended
      </Text>
      <Text size="sm" c="var(--color-ink-muted)">
        It is no longer in the loaded list of sessions.
      </Text>
      <Button type="button" variant="default" onClick={onBack}>
        Back to table
      </Button>
    </Stack>
  );
}

export interface AdminSessionMonitorState {
  active: boolean;
  roleError: string | null;
  joinError: string | null;
  joining: boolean;
  onRetry(): void;
}

/** Comp `desk2` main area: header panel, then the map frame. */
export function AdminSessionView({
  summary,
  loading,
  openIncidentCount,
  onOpenIncident,
  onBack,
  monitor,
  sessionsUnavailable,
}: {
  summary: AdminSessionSummary | null;
  loading: boolean;
  openIncidentCount: number;
  onOpenIncident(): void;
  onBack(): void;
  monitor: AdminSessionMonitorState;
  sessionsUnavailable: boolean;
}) {
  const navigate = useAppNavigate();
  const setSession = useSessionStore((state) => state.setSession);
  const sessionId = summary?.sessionId ?? null;

  const runModeration = async (action: ModerationAction) => {
    if (!sessionId) throw new Error("Moderation needs a live session.");
    await adminModerateSession(sessionId, action);
    if (action === "cleanupCode") {
      await clearSessionLocalArtifacts(sessionId);
      setSession(null);
      navigate("/admin");
    }
  };
  const moderation = useModerationConfirm({
    sessionCode: summary?.code ?? null,
    run: runModeration,
  });

  if (!summary) {
    return loading ? (
      <Stack gap={12} flex={1} mih={0} aria-hidden="true">
        <Skeleton height={56} radius={16} />
        <Skeleton flex={1} radius={16} />
      </Stack>
    ) : (
      <EndedSession onBack={onBack} />
    );
  }

  const mark = sessionPhaseMark(summary);
  const seekers = summary.roleCounts.seeker;
  const hiders = summary.roleCounts.hider;
  const clock = formatClockDurationFromMs(sessionElapsedMs(summary));

  return (
    <Stack gap={12} flex={1} mih={0} miw={0} data-testid="admin-session-view">
      <Box
        component="section"
        aria-label="Session"
        style={{
          flex: "none",
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 16px",
          background: "var(--color-canvas)",
          border: hairline,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <SessionCode code={summary.code} size="lg" />
        <Text component="span" c="var(--color-ink-muted)" style={{ whiteSpace: "nowrap" }}>
          {resolveAdminSessionAreaLabel(summary) ?? "–"}
        </Text>
        <StatusMark tone={mark.tone} label={mark.label} />
        <Text component="span" c="var(--color-ink-muted)" style={{ whiteSpace: "nowrap" }}>
          {plural(seekers, "seeker", "seekers")} · {plural(hiders, "hider", "hiders")} · {clock}
        </Text>
        {openIncidentCount > 0 ? (
          <Box
            component="span"
            style={{
              height: 24,
              padding: "0 10px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              whiteSpace: "nowrap",
              color: "var(--color-status-error)",
              background: "var(--color-halt-soft)",
            }}
          >
            {plural(openIncidentCount, "open incident", "open incidents")}
          </Box>
        ) : null}
        <Box style={{ flex: 1 }} />
        {openIncidentCount > 0 ? (
          <Button
            type="button"
            variant="default"
            h={36}
            radius={12}
            style={raisedButton}
            onClick={onOpenIncident}
          >
            Open incident
          </Button>
        ) : null}
        <Menu position="bottom-end" radius={12} withinPortal>
          <Menu.Target>
            <Button type="button" variant="default" h={36} radius={12} style={raisedButton}>
              Moderate…
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item onClick={() => moderation.request("end")}>Start end game…</Menu.Item>
            <Menu.Item onClick={() => moderation.request("resetBoard")}>Reset board…</Menu.Item>
            <Menu.Item
              c="var(--color-status-error)"
              onClick={() => moderation.request("cleanupCode")}
            >
              End and retire code…
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Box>
      <Box
        data-testid="admin-map-frame"
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          overflow: "hidden",
          border: hairline,
          borderRadius: 16,
          background: "var(--color-surface-deep)",
        }}
      >
        <AdminMonitorPane
          active={monitor.active}
          joining={monitor.joining}
          errorMessage={monitor.roleError ?? monitor.joinError}
          onRetry={monitor.onRetry}
          sessionsUnavailable={sessionsUnavailable}
        />
      </Box>
      {moderation.confirm}
    </Stack>
  );
}
