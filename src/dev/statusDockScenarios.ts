import type { SyncStatus } from "@/domain/device/sync/sync";
import type {
  PendingQuestionRecord,
  PlayerLocationRecord,
} from "@/domain/session/activity/sessionChat";
import type { PlayerRole } from "@/domain/session/players/playerRole";
import type { SessionRulesInput } from "@/domain/session/rules";
import type { TimerState } from "@/domain/session/timer/timer";

export type StatusDockScenario = {
  id: string;
  title: string;
  note: string;
  sessionCode: string;
  playerRole: PlayerRole;
  timerState: TimerState;
  timerRunning: boolean;
  timerHasStarted: boolean;
  timerSyncing: boolean;
  canStartGame: boolean;
  moveInProgress?: boolean;
  sessionRules: SessionRulesInput;
  pendingQuestions: readonly PendingQuestionRecord[];
  myUid?: string | null;
  hostUid?: string | null;
  seekerLocations?: readonly PlayerLocationRecord[];
  syncStatus: SyncStatus;
  queuedWrites: number;
  syncMessage?: string | null;
  /** Force island into a phone-narrow frame for layout QA. */
  narrowFrame?: boolean;
};

const RULES_HIDE: SessionRulesInput = {
  gameSize: "medium",
  hidingPeriodMinutes: 90,
};

const RULES_SEEK: SessionRulesInput = {
  gameSize: "medium",
  hidingPeriodMinutes: 1,
};

const HOST = "host-uid";
const SEEKER = "seeker-uid";

function pendingBase(
  partial: Partial<PendingQuestionRecord> &
    Pick<PendingQuestionRecord, "id" | "toolType" | "status">,
): PendingQuestionRecord {
  return {
    sessionId: "demo",
    createdByUid: SEEKER,
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    placement: { geometryJson: "{}", metadata: {} },
    replyOptions: [],
    promptText: "Demo prompt",
    ...partial,
  };
}

/** Visual QA fixtures for the Mantine map status island (top dock). */
export const STATUS_DOCK_SCENARIOS: readonly StatusDockScenario[] = [
  {
    id: "prestart-waiting",
    title: "Pre-start · Waiting",
    note: "Guest cannot start; sync idle.",
    sessionCode: "WAIT",
    playerRole: "seeker",
    timerState: { accumulatedMs: 0, runningSince: null },
    timerRunning: false,
    timerHasStarted: false,
    timerSyncing: false,
    canStartGame: false,
    sessionRules: RULES_HIDE,
    pendingQuestions: [],
    syncStatus: "synced",
    queuedWrites: 0,
  },
  {
    id: "prestart-syncing",
    title: "Pre-start · Syncing…",
    note: "Timer bootstrap in flight.",
    sessionCode: "SYNC",
    playerRole: "hider",
    timerState: { accumulatedMs: 0, runningSince: null },
    timerRunning: false,
    timerHasStarted: false,
    timerSyncing: true,
    canStartGame: true,
    sessionRules: RULES_HIDE,
    pendingQuestions: [],
    syncStatus: "saving",
    queuedWrites: 0,
  },
  {
    id: "prestart-start",
    title: "Pre-start · Start",
    note: "Host Start CTA (compact island height).",
    sessionCode: "GOGO",
    playerRole: "hider",
    timerState: { accumulatedMs: 0, runningSince: null },
    timerRunning: false,
    timerHasStarted: false,
    timerSyncing: false,
    canStartGame: true,
    sessionRules: RULES_HIDE,
    pendingQuestions: [],
    myUid: HOST,
    hostUid: HOST,
    syncStatus: "synced",
    queuedWrites: 0,
  },
  {
    id: "hiding-running",
    title: "Hiding · countdown",
    note: "Role-free status; session elapsed above hide countdown.",
    sessionCode: "HIDE",
    playerRole: "seeker",
    timerState: { accumulatedMs: 12 * 60_000, runningSince: Date.now() },
    timerRunning: true,
    timerHasStarted: true,
    timerSyncing: false,
    canStartGame: false,
    sessionRules: RULES_HIDE,
    pendingQuestions: [],
    syncStatus: "synced",
    queuedWrites: 0,
  },
  {
    id: "hiding-paused",
    title: "Hiding · paused",
    note: "Status Paused; session clock muted.",
    sessionCode: "PAUS",
    playerRole: "hider",
    timerState: { accumulatedMs: 45 * 60_000, runningSince: null },
    timerRunning: false,
    timerHasStarted: true,
    timerSyncing: false,
    canStartGame: false,
    sessionRules: RULES_HIDE,
    pendingQuestions: [],
    syncStatus: "synced",
    queuedWrites: 0,
  },
  {
    id: "moving",
    title: "Moving",
    note: "Relocation in progress keeps · Moving on the line.",
    sessionCode: "MOVE",
    playerRole: "seeker",
    timerState: { accumulatedMs: 20 * 60_000, runningSince: Date.now() },
    timerRunning: true,
    timerHasStarted: true,
    timerSyncing: false,
    canStartGame: false,
    moveInProgress: true,
    sessionRules: RULES_HIDE,
    pendingQuestions: [],
    syncStatus: "synced",
    queuedWrites: 0,
  },
  {
    id: "seeking",
    title: "Seeking · elapsed",
    note: "Past hiding period; seek clock is primary.",
    sessionCode: "SEEK",
    playerRole: "seeker",
    timerState: { accumulatedMs: 8 * 60_000, runningSince: Date.now() },
    timerRunning: true,
    timerHasStarted: true,
    timerSyncing: false,
    canStartGame: false,
    sessionRules: RULES_SEEK,
    pendingQuestions: [],
    syncStatus: "synced",
    queuedWrites: 0,
  },
  {
    id: "seeking-hider",
    title: "Seeking · same for hider",
    note: "Status is session phase, not player role.",
    sessionCode: "HDR1",
    playerRole: "hider",
    timerState: { accumulatedMs: 15 * 60_000, runningSince: Date.now() },
    timerRunning: true,
    timerHasStarted: true,
    timerSyncing: false,
    canStartGame: false,
    sessionRules: RULES_SEEK,
    pendingQuestions: [],
    syncStatus: "synced",
    queuedWrites: 0,
  },
  {
    id: "observer",
    title: "Seeking · observer session",
    note: "Still Seeking; role never appears on the island.",
    sessionCode: "OBS1",
    playerRole: "observer",
    timerState: { accumulatedMs: 20 * 60_000, runningSince: Date.now() },
    timerRunning: true,
    timerHasStarted: true,
    timerSyncing: false,
    canStartGame: false,
    sessionRules: RULES_SEEK,
    pendingQuestions: [],
    syncStatus: "synced",
    queuedWrites: 0,
  },
  {
    id: "question-countdown",
    title: "Question · radar countdown",
    note: "Status Asking; secondary is tool + deadline.",
    sessionCode: "RADR",
    playerRole: "seeker",
    timerState: { accumulatedMs: 20 * 60_000, runningSince: Date.now() },
    timerRunning: true,
    timerHasStarted: true,
    timerSyncing: false,
    canStartGame: false,
    sessionRules: RULES_SEEK,
    pendingQuestions: [
      pendingBase({
        id: "pq-radar",
        toolType: "radar",
        status: "pending",
        answerableAt: new Date(Date.now() - 30_000).toISOString(),
      }),
    ],
    syncStatus: "synced",
    queuedWrites: 0,
  },
  {
    id: "thermo-walking",
    title: "Thermometer · walking",
    note: "Status Walking; view-only (no Cancel on the island).",
    sessionCode: "WALK",
    playerRole: "seeker",
    timerState: { accumulatedMs: 25 * 60_000, runningSince: Date.now() },
    timerRunning: true,
    timerHasStarted: true,
    timerSyncing: false,
    canStartGame: false,
    sessionRules: RULES_SEEK,
    pendingQuestions: [
      pendingBase({
        id: "pq-walk",
        toolType: "thermometer",
        status: "walking",
        createdByUid: SEEKER,
        createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
      }),
    ],
    myUid: SEEKER,
    hostUid: HOST,
    seekerLocations: [
      {
        uid: SEEKER,
        sessionId: "demo",
        lat: 0,
        lng: 0,
        updatedAt: new Date().toISOString(),
      },
    ],
    syncStatus: "synced",
    queuedWrites: 0,
  },
  {
    id: "thermo-stale",
    title: "Thermometer · Stale GPS",
    note: "Status Walking; secondary shows Stale GPS.",
    sessionCode: "STAL",
    playerRole: "seeker",
    timerState: { accumulatedMs: 40 * 60_000, runningSince: Date.now() },
    timerRunning: true,
    timerHasStarted: true,
    timerSyncing: false,
    canStartGame: false,
    sessionRules: RULES_SEEK,
    pendingQuestions: [
      pendingBase({
        id: "pq-stale",
        toolType: "thermometer",
        status: "walking",
        createdByUid: SEEKER,
        createdAt: new Date(Date.now() - 35 * 60_000).toISOString(),
      }),
    ],
    myUid: HOST,
    hostUid: HOST,
    seekerLocations: [
      {
        uid: SEEKER,
        sessionId: "demo",
        lat: 0,
        lng: 0,
        updatedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      },
    ],
    syncStatus: "synced",
    queuedWrites: 0,
  },
  {
    id: "sync-offline",
    title: "Sync · offline queued",
    note: "Segment short label + warning tone.",
    sessionCode: "OFF1",
    playerRole: "seeker",
    timerState: { accumulatedMs: 10 * 60_000, runningSince: Date.now() },
    timerRunning: true,
    timerHasStarted: true,
    timerSyncing: false,
    canStartGame: false,
    sessionRules: RULES_HIDE,
    pendingQuestions: [],
    syncStatus: "offline",
    queuedWrites: 3,
  },
  {
    id: "sync-degraded",
    title: "Sync · unstable",
    note: "Degraded connection label.",
    sessionCode: "DEG1",
    playerRole: "seeker",
    timerState: { accumulatedMs: 10 * 60_000, runningSince: Date.now() },
    timerRunning: true,
    timerHasStarted: true,
    timerSyncing: false,
    canStartGame: false,
    sessionRules: RULES_HIDE,
    pendingQuestions: [],
    syncStatus: "degraded",
    queuedWrites: 1,
  },
  {
    id: "sync-error",
    title: "Sync · error",
    note: "Sync issue beacon + detail menu.",
    sessionCode: "ERR1",
    playerRole: "hider",
    timerState: { accumulatedMs: 5 * 60_000, runningSince: Date.now() },
    timerRunning: true,
    timerHasStarted: true,
    timerSyncing: false,
    canStartGame: false,
    sessionRules: RULES_HIDE,
    pendingQuestions: [],
    syncStatus: "error",
    queuedWrites: 0,
    syncMessage: "permission-denied",
  },
  {
    id: "narrow-hiding",
    title: "Narrow · <380px",
    note: "Beacon-only sync; compact Hide/Seek words.",
    sessionCode: "N380",
    playerRole: "seeker",
    timerState: { accumulatedMs: 18 * 60_000, runningSince: Date.now() },
    timerRunning: true,
    timerHasStarted: true,
    timerSyncing: false,
    canStartGame: false,
    sessionRules: RULES_HIDE,
    pendingQuestions: [],
    syncStatus: "synced",
    queuedWrites: 0,
    narrowFrame: true,
  },
  {
    id: "narrow-moving",
    title: "Narrow · Moving → Move",
    note: "Status Move under 380px.",
    sessionCode: "NMOV",
    playerRole: "seeker",
    timerState: { accumulatedMs: 18 * 60_000, runningSince: Date.now() },
    timerRunning: true,
    timerHasStarted: true,
    timerSyncing: false,
    canStartGame: false,
    moveInProgress: true,
    sessionRules: RULES_HIDE,
    pendingQuestions: [],
    syncStatus: "synced",
    queuedWrites: 0,
    narrowFrame: true,
  },
];

/** ponytail: unique ids so the gallery cannot silently collide. */
export function assertStatusDockScenarioIdsUnique(
  scenarios: readonly StatusDockScenario[] = STATUS_DOCK_SCENARIOS,
): void {
  const seen = new Set<string>();
  for (const scenario of scenarios) {
    if (seen.has(scenario.id)) {
      throw new Error(`Duplicate status-dock scenario id: ${scenario.id}`);
    }
    seen.add(scenario.id);
  }
}
