import type { ReactNode } from "react";
import type { MapTool } from "@/state/sessionStore";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
} from "@/domain/session/activity/sessionChat";
import type { SessionRulesInput } from "@/domain/session/rules";
import { type TimerState } from "@/domain/session/timer/timer";
import { type PlayerRole } from "@/domain/session/players/playerRole";
import { ToolStatusBlockMantine } from "./ToolStatusBlockMantine";

interface ToolStatusBlockProps {
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
  onCancelWalkingQuestion?: (pendingQuestionId: string) => void;
  timerMenuOpen: boolean;
  onOpenTimerMenu: () => void;
  onTimerPause?: () => void;
  onTimerResume?: () => void;
  timerControlsDisabled?: boolean;
  /** Hider Play Move in progress — PHASE shows MOVE for all roles. */
  moveInProgress?: boolean;
  /** Show role + mode inline (desktop ops status). */
  expanded?: boolean;
  /** Home / leave control rendered leading in the brand cell. */
  headerLeading?: ReactNode;
  /** Trailing sync control for Mantine single island. */
  syncSlot?: ReactNode;
}

export function ToolStatusBlock(props: ToolStatusBlockProps) {
  return <ToolStatusBlockMantine {...props} />;
}
