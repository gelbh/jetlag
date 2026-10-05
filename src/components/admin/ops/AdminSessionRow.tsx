import { Badge, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { resolveAdminSessionAreaLabel } from "../../../domain/admin/adminSessionAreaLabel";
import { formatFreshnessAge } from "../../../domain/admin/formatAdminFreshness";
import { adminSessionPhaseLabel } from "../../../domain/admin/sessionPhase";
import { useFreshnessClock } from "../../../hooks/time/useFreshnessClock";
import type { AdminSessionSummary } from "../../../services/admin/adminSessions";

interface AdminSessionRowProps {
  summary: AdminSessionSummary;
  observingCode: string | null;
  selected?: boolean;
  onMonitor: (summary: AdminSessionSummary) => void;
}

function modeLabel(mode: AdminSessionSummary["mode"]): string {
  return mode === "multiplayer" ? "MP" : "SP";
}

export function AdminSessionRow({
  summary,
  observingCode,
  selected = false,
  onMonitor,
}: AdminSessionRowProps) {
  const nowMs = useFreshnessClock();
  const joiningThisSession = observingCode === summary.code;
  const monitorJoinPending = observingCode !== null;
  const areaLabel = resolveAdminSessionAreaLabel(summary);

  return (
    <UnstyledButton
      type="button"
      className={`admin-session-row admin-session-row-dense w-full items-start gap-2 px-3 py-2 text-left ${
        selected ? "ring-2 ring-brand-blue/50" : ""
      }`}
      style={{
        display: "flex",
        width: "100%",
        borderRadius: "var(--jl-control-radius, 14px)",
        border: "var(--jl-hairline, 0.33px) solid oklch(from var(--color-field-ink) l c h / 0.14)",
        background: "oklch(from var(--color-canvas) calc(l + 0.04) c h)",
        color: "var(--color-field-ink)",
      }}
      data-feedback="tap"
      disabled={monitorJoinPending}
      onClick={() => onMonitor(summary)}
    >
      <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
        <Group gap={6} wrap="wrap">
          <Text ff="monospace" size="lg" fw={700} style={{ letterSpacing: "0.18em" }}>
            {summary.code}
          </Text>
          {areaLabel ? (
            <Text size="sm" truncate>
              {areaLabel}
            </Text>
          ) : null}
        </Group>
        <Group gap={6} wrap="wrap">
          {summary.isLive ? (
            <Badge size="xs" variant="light" color="green" radius="xl" tt="uppercase">
              Live
            </Badge>
          ) : null}
          <Badge size="xs" variant="outline" radius="xl" tt="uppercase" c="dimmed">
            {modeLabel(summary.mode)}
          </Badge>
          <Badge size="xs" variant="light" radius="xl" tt="uppercase">
            {adminSessionPhaseLabel(summary.phase)}
          </Badge>
        </Group>
        <Text size="xs" c="dimmed">
          Activity {formatFreshnessAge(summary.lastActivityAt, nowMs)} · Location{" "}
          {formatFreshnessAge(summary.lastLocationAt, nowMs)} · {summary.roleCounts.seeker}S /{" "}
          {summary.roleCounts.hider}H
          {summary.roleCounts.observer > 0
            ? ` · ${summary.roleCounts.observer} observer${summary.roleCounts.observer === 1 ? "" : "s"}`
            : ""}
          {summary.activeAnnotationCount > 0 ? ` · ${summary.activeAnnotationCount} ann` : ""}
        </Text>
      </Stack>
      <Text
        component="span"
        size="xs"
        fw={600}
        tt="uppercase"
        c="blue"
        style={{ flexShrink: 0, letterSpacing: "0.04em" }}
      >
        {joiningThisSession ? "Joining…" : "Monitor"}
      </Text>
    </UnstyledButton>
  );
}
