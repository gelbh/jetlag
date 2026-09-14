import type {
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardRole,
  LeaderboardScope,
} from "../../domain/game/leaderboard";
import type { GameSize } from "../../domain/session/size/gameSize";

export const LEADERBOARD_MOCK_STORAGE_KEY = "jl.leaderboard.mock";
/** Stable viewer uid when browsing under leaderboard mock. */
export const LEADERBOARD_MOCK_SELF_UID = "mock-lb-self";

const MOCK_LATENCY_MS = 240;

type SeedPlayer = {
  uid: string;
  displayName: string;
  /** Base score; metric/role/size nudge this for variety. */
  base: number;
  friends: boolean;
};

const SEED_PLAYERS: SeedPlayer[] = [
  { uid: LEADERBOARD_MOCK_SELF_UID, displayName: "you_local", base: 4200, friends: true },
  { uid: "mock-lb-1", displayName: "ally_fox", base: 12800, friends: true },
  { uid: "mock-lb-2", displayName: "map_runner", base: 11200, friends: true },
  { uid: "mock-lb-3", displayName: "dublin_hider", base: 9800, friends: true },
  { uid: "mock-lb-4", displayName: "seek_squad", base: 8600, friends: true },
  { uid: "mock-lb-5", displayName: "radar_ray", base: 7400, friends: false },
  { uid: "mock-lb-6", displayName: "tentacle_tom", base: 6900, friends: false },
  { uid: "mock-lb-7", displayName: "nova_nav", base: 6100, friends: false },
  { uid: "mock-lb-8", displayName: "cipher_cat", base: 5400, friends: false },
  { uid: "mock-lb-9", displayName: "zone_zen", base: 4800, friends: false },
  { uid: "mock-lb-10", displayName: "pin_piper", base: 4100, friends: false },
  { uid: "mock-lb-11", displayName: "bora_bora", base: 3600, friends: false },
  { uid: "mock-lb-12", displayName: "bobby_tables", base: 2900, friends: false },
];

export type LeaderboardPlayerSheetProfile = {
  gamesPlayed: number | null;
  wins: number | null;
  bestStreak: number | null;
  lastPlayedLabel: string | null;
};

const EMPTY_PLAYER_PROFILE: LeaderboardPlayerSheetProfile = {
  gamesPlayed: null,
  wins: null,
  bestStreak: null,
  lastPlayedLabel: null,
};

const MOCK_PLAYER_PROFILES: Record<string, LeaderboardPlayerSheetProfile> = {
  [LEADERBOARD_MOCK_SELF_UID]: {
    gamesPlayed: 18,
    wins: 7,
    bestStreak: 3,
    lastPlayedLabel: "Local · today",
  },
  "mock-lb-1": {
    gamesPlayed: 42,
    wins: 19,
    bestStreak: 6,
    lastPlayedLabel: "Dublin · 3d ago",
  },
  "mock-lb-2": {
    gamesPlayed: 31,
    wins: 12,
    bestStreak: 4,
    lastPlayedLabel: "Osaka · 1w ago",
  },
  "mock-lb-3": {
    gamesPlayed: 27,
    wins: 14,
    bestStreak: 5,
    lastPlayedLabel: "Lucerne · yesterday",
  },
};

export function isLeaderboardMockEnabled(): boolean {
  try {
    return localStorage.getItem(LEADERBOARD_MOCK_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setLeaderboardMockEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(LEADERBOARD_MOCK_STORAGE_KEY, "1");
    } else {
      localStorage.removeItem(LEADERBOARD_MOCK_STORAGE_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}

export function getLeaderboardPlayerSheetProfile(
  uid: string,
): LeaderboardPlayerSheetProfile {
  if (!isLeaderboardMockEnabled()) {
    return EMPTY_PLAYER_PROFILE;
  }
  return MOCK_PLAYER_PROFILES[uid] ?? EMPTY_PLAYER_PROFILE;
}

function sizeFactor(gameSize: GameSize): number {
  switch (gameSize) {
    case "small":
      return 0.72;
    case "medium":
      return 1;
    case "large":
      return 1.35;
    default:
      return 1;
  }
}

function roleFactor(role: LeaderboardRole): number {
  return role === "hider" ? 0.88 : 1;
}

function metricValue(metric: LeaderboardMetric, base: number): number {
  switch (metric) {
    case "distance_traveled":
    case "max_from_start":
      return base;
    case "questions":
      return Math.round(base / 400);
    case "wins":
      return Math.max(1, Math.round(base / 1200));
    case "avg_answer_time":
      return Math.round(45_000 + (15_000 - base / 2));
    case "phase_time":
    case "round_duration":
      return Math.round(600_000 + base * 40);
    default: {
      const never: never = metric;
      return never;
    }
  }
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), MOCK_LATENCY_MS);
  });
}

export async function mockListLeaderboardBoard(args: {
  scope: LeaderboardScope;
  gameSize: GameSize;
  role: LeaderboardRole;
  metric: LeaderboardMetric;
}): Promise<LeaderboardEntry[]> {
  const pool =
    args.scope === "friends"
      ? SEED_PLAYERS.filter((player) => player.friends)
      : SEED_PLAYERS;

  const ranked = pool
    .map((player) => {
      const scaled =
        player.base * sizeFactor(args.gameSize) * roleFactor(args.role);
      return {
        uid: player.uid,
        displayName: player.displayName,
        value: metricValue(args.metric, scaled),
        rank: 0,
      };
    })
    .sort((a, b) => {
      // Lower is better for time metrics.
      if (
        args.metric === "avg_answer_time" ||
        args.metric === "phase_time" ||
        args.metric === "round_duration"
      ) {
        return a.value - b.value;
      }
      return b.value - a.value;
    })
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

  return delay(ranked);
}

/** One-shot style subscribe used by the Mantine iOS body. */
export function subscribeMockLeaderboardBoard(
  scope: LeaderboardScope,
  gameSize: GameSize,
  role: LeaderboardRole,
  metric: LeaderboardMetric,
  onNext: (entries: LeaderboardEntry[]) => void,
  onError: (error: Error) => void,
): () => void {
  let cancelled = false;
  void mockListLeaderboardBoard({ scope, gameSize, role, metric })
    .then((entries) => {
      if (!cancelled) {
        onNext(entries);
      }
    })
    .catch((error: unknown) => {
      if (!cancelled) {
        onError(
          error instanceof Error ? error : new Error("Mock board failed."),
        );
      }
    });
  return () => {
    cancelled = true;
  };
}
