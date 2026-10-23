/** Standoff turn / round clocks and Last Word arming (pure). */

export type StandoffTeamId = "teamA" | "teamB";

export type StandoffTurnPhase = "turn" | "answer" | "postLastWord" | "dusk";

export type StandoffClocks = {
  turnSeconds: number;
  answerSeconds: number;
  photoAnswerSeconds: number;
};

export const DEFAULT_STANDOFF_CLOCKS: StandoffClocks = {
  turnSeconds: 15 * 60,
  answerSeconds: 5 * 60,
  photoAnswerSeconds: 10 * 60,
};

export const STANDOFF_MAX_ROUNDS = 10;

export type StandoffTurnState = {
  round: number;
  activeTeam: StandoffTeamId;
  /** Acts completed in the current round (0 or 1 before round bumps). */
  actsInRound: number;
  phase: StandoffTurnPhase;
  deadlineMs: number;
  clocks: StandoffClocks;
  lastWordArmedFor: StandoffTeamId | null;
  lastWordPending: boolean;
  duskReady: boolean;
};

function otherTeam(team: StandoffTeamId): StandoffTeamId {
  return team === "teamA" ? "teamB" : "teamA";
}

export function createInitialStandoffTurn(
  nowMs: number,
  clocks: StandoffClocks = DEFAULT_STANDOFF_CLOCKS,
): StandoffTurnState {
  return {
    round: 1,
    activeTeam: "teamA",
    actsInRound: 0,
    phase: "turn",
    deadlineMs: nowMs + clocks.turnSeconds * 1000,
    clocks,
    lastWordArmedFor: null,
    lastWordPending: false,
    duskReady: false,
  };
}

export function whoseTurn(turn: StandoffTurnState): StandoffTeamId {
  return turn.activeTeam;
}

export function startAnswerWindow(
  turn: StandoffTurnState,
  opts: { nowMs: number; photo: boolean; doubleTime: boolean },
): StandoffTurnState {
  const base = opts.photo ? turn.clocks.photoAnswerSeconds : turn.clocks.answerSeconds;
  const seconds = opts.doubleTime ? base * 2 : base;
  return {
    ...turn,
    phase: "answer",
    deadlineMs: opts.nowMs + seconds * 1000,
  };
}

/** After an answer (or pass): flip team; bump round after both teams acted. */
export function advanceAfterAnswer(turn: StandoffTurnState, nowMs: number): StandoffTurnState {
  if (turn.lastWordPending && turn.activeTeam === turn.lastWordArmedFor) {
    return {
      ...turn,
      lastWordPending: false,
      phase: "postLastWord",
      activeTeam: otherTeam(turn.activeTeam),
      deadlineMs: nowMs + turn.clocks.turnSeconds * 1000,
    };
  }

  if (turn.duskReady) {
    return { ...turn, phase: "dusk", deadlineMs: nowMs };
  }

  const actsInRound = turn.actsInRound + 1;
  if (actsInRound >= 2) {
    const nextRound = Math.min(turn.round + 1, STANDOFF_MAX_ROUNDS);
    const duskReady = turn.round >= STANDOFF_MAX_ROUNDS;
    return {
      ...turn,
      round: nextRound,
      actsInRound: 0,
      activeTeam: otherTeam(turn.activeTeam),
      phase: duskReady ? "dusk" : "turn",
      deadlineMs: nowMs + turn.clocks.turnSeconds * 1000,
      duskReady,
    };
  }

  return {
    ...turn,
    actsInRound,
    activeTeam: otherTeam(turn.activeTeam),
    phase: "turn",
    deadlineMs: nowMs + turn.clocks.turnSeconds * 1000,
  };
}

/** First Breach arms Last Word for the opposing team (V8). */
export function armLastWord(
  turn: StandoffTurnState,
  breachingTeam: StandoffTeamId,
): StandoffTurnState {
  if (turn.lastWordArmedFor !== null) {
    return turn;
  }
  return {
    ...turn,
    lastWordArmedFor: otherTeam(breachingTeam),
    lastWordPending: true,
  };
}
