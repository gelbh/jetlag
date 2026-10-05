import { Box, Button, Group, Paper, Stack, Text } from "@mantine/core";
import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import {
  mapIslandFilledStyles,
  mapIslandIconStyles,
  mapStatusIslandStyles,
} from "@/components/ui/entry/entryChrome";
import {
  mapIslandSessionStatus,
  mapIslandSessionStatusCompact,
  mapIslandStatusIsLive,
} from "@/domain/device/surveyStatusCopy";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
} from "@/domain/session/activity/sessionChat";
import type { PlayerRole } from "@/domain/session/players/playerRole";
import type { SessionRulesInput } from "@/domain/session/rules";
import { type TimerState } from "@/domain/session/timer/timer";
import { useMinWidth } from "@/hooks/layout/useMinWidth";
import { serverNow } from "@/services/core/time/serverClock";
import type { MapTool } from "@/state/sessionStore";
import { JlIcon } from "../../ui/brand/JlIcon";
import { MapTimerCluster } from "../mapChrome/MapTimerCluster";

export type ToolStatusBlockProps = {
  sessionCode: string;
  playerRole: PlayerRole;
  activeTool: MapTool;
  timerState: TimerState;
  timerRunning: boolean;
  timerHasStarted: boolean;
  timerSyncing: boolean;
  canStartGame: boolean;
  onStartGame: () => void;
  sessionRules: SessionRulesInput;
  pendingQuestions: readonly PendingQuestionRecord[];
  myUid?: string | null;
  hostUid?: string | null;
  seekerLocations?: readonly PlayerLocationRecord[];
  /** @deprecated Island is view-only; cancel lives elsewhere. */
  onCancelWalkingQuestion?: (pendingQuestionId: string) => void;
  /** @deprecated Island timer is view-only. */
  timerMenuOpen?: boolean;
  /** @deprecated Island timer is view-only. */
  onOpenTimerMenu?: () => void;
  onTimerPause?: () => void;
  onTimerResume?: () => void;
  timerControlsDisabled?: boolean;
  moveInProgress?: boolean;
  headerLeading?: ReactNode;
  /** Trailing sync control (segment, not a sibling floater). */
  syncSlot?: ReactNode;
  /** Dev gallery: force <380px copy/timer rules regardless of viewport. */
  forceNarrow?: boolean;
};

function SegmentRule() {
  return (
    <Box
      aria-hidden
      style={{
        alignSelf: "stretch",
        width: 1,
        marginBlock: 8,
        marginInline: 2,
        backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.14)",
        flexShrink: 0,
      }}
    />
  );
}

/**
 * One continuous status island (Home / Start / PauseIcon / Sync):
 * Home | CODE + session status | session+phase timers | sync (display only)

 */
export function ToolStatusBlock({
  sessionCode,
  playerRole: _playerRole,
  activeTool: _activeTool,
  timerState,
  timerRunning,
  timerHasStarted,
  timerSyncing,
  canStartGame,
  onStartGame,
  sessionRules,
  pendingQuestions,
  myUid = null,
  hostUid = null,
  seekerLocations = [],
  moveInProgress = false,
  onTimerPause,
  onTimerResume,
  timerControlsDisabled = false,
  headerLeading,
  syncSlot,
  forceNarrow = false,
}: ToolStatusBlockProps) {
  void _activeTool;
  void _playerRole;
  const comfortableWidth = useMinWidth(380) && !forceNarrow;
  const status = mapIslandSessionStatus({
    timerHasStarted,
    timerSyncing,
    timerRunning,
    canStartGame,
    moveInProgress,
    sessionRules,
    timerState,
    nowMs: serverNow(),
    pendingQuestions,
  });
  const statusLabel = comfortableWidth ? status : mapIslandSessionStatusCompact(status);
  const statusIsLive = mapIslandStatusIsLive(status);

  let timerBody: ReactNode;
  if (!timerHasStarted) {
    if (canStartGame && !timerSyncing) {
      timerBody = (
        <Button
          type="button"
          size="compact-md"
          onClick={onStartGame}
          leftSection={<JlIcon icon={PlayIcon} size={14} weight="bold" />}
          styles={mapIslandFilledStyles}
          className="jl-map-chrome-press"
        >
          Start
        </Button>
      );
    } else {
      timerBody = null;
    }
  } else {
    const pauseResumeDisabled =
      timerControlsDisabled || (!timerRunning && !onTimerResume) || (timerRunning && !onTimerPause);
    timerBody = (
      <Group gap={6} wrap="nowrap" align="center" style={{ minWidth: 0 }}>
        <MapTimerCluster
          sessionRules={sessionRules}
          timerState={timerState}
          timerRunning={timerRunning}
          timerHasStarted={timerHasStarted}
          pendingQuestions={pendingQuestions}
          myUid={myUid}
          hostUid={hostUid}
          seekerLocations={seekerLocations}
        />
        {onTimerPause || onTimerResume ? (
          <Button
            type="button"
            size="compact-md"
            aria-label={timerRunning ? "PauseIcon timer" : "Resume timer"}
            disabled={pauseResumeDisabled}
            onClick={() => {
              if (timerRunning) {
                onTimerPause?.();
              } else {
                onTimerResume?.();
              }
            }}
            styles={mapIslandIconStyles}
            className="jl-map-chrome-press"
            ml={4}
          >
            <JlIcon icon={timerRunning ? PauseIcon : PlayIcon} size={16} weight="bold" />
          </Button>
        ) : null}
      </Group>
    );
  }

  return (
    <Paper
      data-testid="tool-status-block-mantine"
      radius={22}
      className="pointer-events-auto w-full min-w-0"
      styles={{
        root: {
          ...mapStatusIslandStyles,
          borderRadius: 22,
          minHeight: "2.75rem",
          color: "var(--color-field-ink)",
          overflow: "visible",
        },
      }}
    >
      <Group
        wrap="nowrap"
        gap={0}
        align="center"
        px={6}
        py={5}
        w="100%"
        className="jl-status-header-brand"
        style={{ minWidth: 0 }}
      >
        {headerLeading ? (
          <Group
            justify="center"
            align="center"
            wrap="nowrap"
            style={{
              width: "2.5rem",
              minWidth: "2.5rem",
              height: "2.5rem",
              flexShrink: 0,
              color: "var(--color-field-ink)",
            }}
          >
            {headerLeading}
          </Group>
        ) : null}

        {headerLeading ? <SegmentRule /> : null}

        <Stack
          gap={1}
          justify="center"
          px={8}
          style={{ minWidth: 0, flex: "1 1 0%", overflow: "hidden" }}
        >
          <Text
            fw={700}
            size="sm"
            ff="monospace"
            className="jl-view-transition-session-code"
            style={{
              letterSpacing: "0.1em",
              lineHeight: 1.2,
              color: "var(--color-field-ink)",
              fontVariantNumeric: "tabular-nums",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {sessionCode}
          </Text>
          <Group gap={4} wrap="nowrap" align="center" style={{ minWidth: 0 }}>
            {statusIsLive ? (
              <Box
                aria-hidden
                className="jl-map-phase-live-dot"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: "var(--color-flag)",
                  flexShrink: 0,
                }}
              />
            ) : null}
            <Text
              size="xs"
              fw={510}
              style={{
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
                color: statusIsLive ? "var(--color-flag)" : "var(--color-field-ink-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                minWidth: 0,
              }}
            >
              {statusLabel}
            </Text>
          </Group>
        </Stack>

        {timerBody ? (
          <>
            <SegmentRule />
            <Group
              gap={6}
              wrap="nowrap"
              justify="flex-end"
              px={8}
              py={2}
              style={{ flex: "0 1 auto", minWidth: 0, maxWidth: "46%" }}
            >
              {timerBody}
            </Group>
          </>
        ) : null}

        {syncSlot ? (
          <>
            <SegmentRule />
            <Group
              justify="center"
              align="center"
              wrap="nowrap"
              px={2}
              style={{
                flex: "0 0 auto",
                maxWidth: comfortableWidth ? "7.5rem" : "2.75rem",
                position: "relative",
                color: "var(--color-field-ink)",
                overflow: "visible",
              }}
            >
              {syncSlot}
            </Group>
          </>
        ) : null}
      </Group>
    </Paper>
  );
}
