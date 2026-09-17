import { useMemo } from "react";
import {
  Box,
  Button,
  Group,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import {
  ArrowRight,
  Flag,
  FlagCheckered,
  MagnifyingGlass,
  PencilSimple,
  Timer,
} from "@phosphor-icons/react";
import { isActive, type AnnotationRecord } from "@/domain/map/annotations";
import type { DockableMapTool } from "@/domain/map/mapTools";
import {
  activityAnnotationId,
  groupSessionActivityEntries,
  sessionActivitySummary,
  type SessionActivityEvent,
  type SessionActivityLogEntry,
  type SessionActivityType,
} from "@/domain/session/activity/sessionActivityLog";
import { HudToolIcon } from "@/components/map/icons/ToolIcons";
import {
  iosCompactDangerStyles,
  iosCompactGrayStyles,
} from "@/components/ui/apple/iosEntryChrome";
import { EmptyState } from "@/components/ui/feedback/EmptyState";
import { useStickScrollToBottom } from "@/hooks/ui/useStickScrollToBottom";

interface SessionLogBodyProps {
  events: readonly SessionActivityEvent[];
  annotations: AnnotationRecord[];
  onDelete: (annotationId: string) => void;
  onEdit: (annotationId: string) => void;
  onSelect?: (annotationId: string) => void;
  readOnly?: boolean;
  compact?: boolean;
}

const DOCK_ICON_TOOLS = new Set<DockableMapTool>([
  "matching",
  "measuring",
  "thermometer",
  "radar",
  "tentacle",
  "photo",
  "zone",
  "pin",
]);

function asDockTool(value: string | undefined): DockableMapTool | null {
  if (!value) {
    return null;
  }
  return DOCK_ICON_TOOLS.has(value as DockableMapTool)
    ? (value as DockableMapTool)
    : null;
}

function activityDockTool(event: SessionActivityEvent): DockableMapTool | null {
  switch (event.type) {
    case "question_asked":
    case "question_answered":
    case "question_cancelled":
      return asDockTool(event.payload.toolType);
    case "thermometer_walk_started":
    case "thermometer_walk_separated":
      return "thermometer";
    case "photo_asked":
    case "photo_answered":
      return "photo";
    default:
      return null;
  }
}

function markColor(type: SessionActivityType): string {
  switch (type) {
    case "session_started":
    case "hiding_timer_started":
    case "seeking_started":
      return "var(--color-signal)";
    case "question_asked":
    case "thermometer_walk_started":
    case "photo_asked":
      return "var(--color-flag)";
    case "question_answered":
    case "thermometer_walk_separated":
    case "photo_answered":
      return "var(--color-trail)";
    case "question_cancelled":
      return "var(--color-halt)";
    case "game_ended":
      return "var(--color-field-ink-muted)";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function EventGlyph({
  event,
  size = 16,
}: {
  event: SessionActivityEvent;
  size?: number;
}) {
  const tool = activityDockTool(event);
  if (tool) {
    const icon = <HudToolIcon tool={tool} width={size} height={size} />;
    return icon ?? <PencilSimple size={size} weight="bold" aria-hidden />;
  }

  switch (event.type) {
    case "session_started":
      return <Flag size={size} weight="bold" aria-hidden />;
    case "hiding_timer_started":
      return <Timer size={size} weight="bold" aria-hidden />;
    case "seeking_started":
      return <MagnifyingGlass size={size} weight="bold" aria-hidden />;
    case "game_ended":
      return <FlagCheckered size={size} weight="bold" aria-hidden />;
    default:
      return <PencilSimple size={size} weight="bold" aria-hidden />;
  }
}

function answeredLate(event: SessionActivityEvent): boolean {
  return event.type === "question_answered" && event.payload.answeredLate === true;
}

function formatLogTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function entryFocusEvent(entry: SessionActivityLogEntry): SessionActivityEvent {
  return entry.kind === "pair" ? entry.resolved : entry.event;
}

function entryKey(entry: SessionActivityLogEntry): string {
  return entry.kind === "pair"
    ? `${entry.asked.id}:${entry.resolved.id}`
    : entry.event.id;
}

function askPrompt(event: SessionActivityEvent): string {
  switch (event.type) {
    case "question_asked":
    case "question_cancelled":
    case "question_answered":
      return event.payload.promptText;
    case "photo_asked":
    case "photo_answered":
    case "thermometer_walk_started":
    case "thermometer_walk_separated":
      return event.payload.promptText ?? sessionActivitySummary(event);
    default:
      return sessionActivitySummary(event);
  }
}

function resolveText(event: SessionActivityEvent): string {
  switch (event.type) {
    case "question_answered":
      return event.payload.answerSummary ?? "Answered";
    case "photo_answered":
      return event.payload.answerSummary ?? "Answered";
    case "question_cancelled":
      return "Cancelled";
    case "thermometer_walk_separated":
      return "Ready";
    default:
      return sessionActivitySummary(event);
  }
}

function resolveColor(event: SessionActivityEvent): string {
  if (event.type === "question_cancelled") {
    return "var(--color-halt)";
  }
  return "var(--color-field-ink)";
}

function resolveWash(event: SessionActivityEvent): string {
  if (event.type === "question_cancelled") {
    return "var(--color-halt-soft)";
  }
  return "var(--color-trail-soft)";
}

/**
 * Distilled field-log stake: icon + ask (left) → answer stake box (right).
 */
export function SessionLogBody({
  events,
  annotations,
  onDelete,
  onEdit,
  onSelect,
  readOnly = false,
  compact = false,
}: SessionLogBodyProps) {
  const activeById = useMemo(() => {
    const map = new Map<string, AnnotationRecord>();
    for (const annotation of annotations) {
      if (isActive(annotation)) {
        map.set(annotation.id, annotation);
      }
    }
    return map;
  }, [annotations]);

  const entries = useMemo(() => groupSessionActivityEntries(events), [events]);
  const gap = compact ? 6 : 8;
  const bottomRef = useStickScrollToBottom(entries.length);

  if (entries.length === 0) {
    return <EmptyState>No activity yet.</EmptyState>;
  }

  return (
    <Stack gap={gap}>
      {entries.map((entry) => {
        const focus = entryFocusEvent(entry);
        const linkedId = activityAnnotationId(focus);
        const liveId =
          linkedId && activeById.has(linkedId) ? linkedId : undefined;
        const showActions = Boolean(liveId) && !readOnly;
        const selectable = Boolean(liveId && onSelect);
        const markEvent = entry.kind === "pair" ? entry.resolved : entry.event;
        const color = markColor(markEvent.type);
        const late =
          entry.kind === "pair"
            ? answeredLate(entry.resolved)
            : answeredLate(entry.event);

        const content =
          entry.kind === "pair" ? (
            <Group gap={8} wrap="nowrap" align="stretch">
              <Stack gap={4} style={{ flex: "1 1 0", minWidth: 0 }} justify="center">
                <Text
                  size="sm"
                  c="var(--color-field-ink-muted)"
                  lh={1.3}
                  lineClamp={3}
                  title={askPrompt(entry.asked)}
                >
                  {askPrompt(entry.asked)}
                </Text>
                <Text
                  size="xs"
                  c="var(--color-field-ink-muted)"
                  ff="monospace"
                  lh={1.2}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatLogTime(entry.asked.createdAt)}
                </Text>
              </Stack>

              <Box
                component="span"
                aria-hidden
                style={{
                  alignSelf: "center",
                  flexShrink: 0,
                  display: "flex",
                  color: "var(--color-trail)",
                }}
              >
                <ArrowRight size={14} weight="bold" />
              </Box>

              <Box
                style={{
                  flex: "1.25 1 0",
                  minWidth: 0,
                  alignSelf: "stretch",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 4,
                  padding: compact ? "8px 10px" : "10px 12px",
                  borderRadius: "0.35rem",
                  border: "1px solid var(--color-rule)",
                  backgroundColor: resolveWash(entry.resolved),
                }}
              >
                <Text
                  size="md"
                  fw={700}
                  c={resolveColor(entry.resolved)}
                  lh={1.25}
                  lineClamp={3}
                  title={resolveText(entry.resolved)}
                >
                  {resolveText(entry.resolved)}
                </Text>
                <Text
                  size="xs"
                  c="var(--color-field-ink-muted)"
                  ff="monospace"
                  lh={1.2}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatLogTime(entry.resolved.createdAt)}
                  {late ? " · Late" : ""}
                </Text>
              </Box>
            </Group>
          ) : (
            <Stack gap={2}>
              <Text
                size="sm"
                fw={500}
                c="var(--color-field-ink)"
                lh={1.3}
                lineClamp={2}
                title={sessionActivitySummary(entry.event)}
              >
                {sessionActivitySummary(entry.event)}
              </Text>
              <Text
                size="xs"
                c="var(--color-field-ink-muted)"
                ff="monospace"
                lh={1.2}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {formatLogTime(entry.event.createdAt)}
                {late ? " · Late" : ""}
              </Text>
            </Stack>
          );

        return (
          <Group
            key={entryKey(entry)}
            gap={10}
            wrap="nowrap"
            align="flex-start"
            p={compact ? 8 : 10}
            style={{
              borderRadius: "0.35rem",
              border: "1px solid var(--color-rule)",
              backgroundColor: "var(--color-canvas)",
            }}
          >
            <Box
              c={color}
              style={{
                flexShrink: 0,
                marginTop: 2,
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-hidden
            >
              <EventGlyph event={markEvent} />
            </Box>

            <UnstyledButton
              disabled={!selectable}
              onClick={() => {
                if (liveId && onSelect) {
                  onSelect(liveId);
                }
              }}
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: "left",
                borderRadius: "0.25rem",
                cursor: selectable ? "pointer" : "default",
              }}
              styles={{
                root: {
                  "&:focus-visible": {
                    outline: "2px solid var(--color-flag)",
                    outlineOffset: 2,
                  },
                  "&:disabled": {
                    cursor: "default",
                    opacity: 1,
                  },
                },
              }}
            >
              {content}
            </UnstyledButton>

            {showActions && liveId ? (
              <Stack gap={4} style={{ flexShrink: 0 }}>
                <Button
                  size="compact-xs"
                  onClick={() => onEdit(liveId)}
                  styles={iosCompactGrayStyles}
                >
                  Edit
                </Button>
                <Button
                  size="compact-xs"
                  onClick={() => onDelete(liveId)}
                  styles={iosCompactDangerStyles}
                >
                  Delete
                </Button>
              </Stack>
            ) : null}
          </Group>
        );
      })}
      <div ref={bottomRef} aria-hidden />
    </Stack>
  );
}
