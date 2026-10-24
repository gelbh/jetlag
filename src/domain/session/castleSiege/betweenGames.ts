import type { CastleSiegeCoinAssignment } from "./pregame";
import { serializeSeriesFields } from "./seriesPersist";
import type { SeriesProgression } from "./seriesScore";
import type { StandoffTeamId } from "./standoffTurn";

/** Session keys wiped between games (Approach A: no siege/{gameIndex} history). */
export const BETWEEN_GAMES_CLEAR_KEYS = [
  "standoffTurn",
  "standoffDeckRemainingCount",
  "siegeClock",
  "siegeCapture",
] as const;

export function flipCoinAssignment(
  assignment: CastleSiegeCoinAssignment,
): CastleSiegeCoinAssignment {
  return {
    teamA: assignment.teamB,
    teamB: assignment.teamA,
  };
}

export function flipStandoffOpener(opener: StandoffTeamId): StandoffTeamId {
  return opener === "teamA" ? "teamB" : "teamA";
}

/** Firestore session fields after a game resolves (score / phase / outcome). */
export function buildGameResolvedPatch(progression: SeriesProgression): Record<string, unknown> {
  const series = serializeSeriesFields(progression.state);
  if (progression.kind === "betweenGames") {
    return {
      ...series,
      phase: "betweenGames",
    };
  }
  // Match end: scoreboard + outcome only; leave phase as last playable for chrome.
  return { ...series };
}

export type BetweenGamesContinueInput = {
  setupMode: "pregame" | "fairSplit";
  coinAssignment: CastleSiegeCoinAssignment | null | undefined;
  standoffOpener: StandoffTeamId;
};

/**
 * Host Continue from betweenGames → next-game setup.
 * Border / belt / arena stay; halves flip; seals + marks + per-game clocks clear.
 */
export function buildBetweenGamesContinuePatch(input: BetweenGamesContinueInput): {
  phase: "setup";
  coinAssignment?: CastleSiegeCoinAssignment;
  seriesStandoffOpener: StandoffTeamId;
  clearPerGameKeys: readonly string[];
  clearTeamSeals: boolean;
  clearTeamMarks: boolean;
} {
  const coinAssignment = input.coinAssignment
    ? flipCoinAssignment(input.coinAssignment)
    : undefined;
  return {
    phase: "setup",
    ...(coinAssignment ? { coinAssignment } : {}),
    seriesStandoffOpener: flipStandoffOpener(input.standoffOpener),
    clearPerGameKeys: BETWEEN_GAMES_CLEAR_KEYS,
    // Both Pregame and Fair-split re-seal in the opposite half (S2).
    clearTeamSeals: true,
    clearTeamMarks: true,
  };
}
