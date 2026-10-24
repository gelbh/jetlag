import { buildCastleSiegeCatalog, type CastleSiegeCard, createShuffledDeck } from "./deck";
import {
  createInitialStandoffTurn,
  DEFAULT_STANDOFF_CLOCKS,
  type StandoffTeamId,
  type StandoffTurnState,
} from "./standoffTurn";

export type CastleSiegePhase = "setup" | "standoff" | "siege" | "betweenGames";

export type SerializedStandoffDeck = {
  remainingIds: string[];
  discardIds: string[];
};

export type SerializedStandoffHands = {
  teamA: string[];
  teamB: string[];
};

const catalogById = new Map(buildCastleSiegeCatalog().map((card) => [card.id, card]));

export function cardFromId(id: string): CastleSiegeCard | undefined {
  return catalogById.get(id);
}

export function serializeDeckState(
  deck: CastleSiegeCard[],
  discard: CastleSiegeCard[],
): SerializedStandoffDeck {
  return {
    remainingIds: deck.map((c) => c.id),
    discardIds: discard.map((c) => c.id),
  };
}

export function deserializeDeckState(
  value: unknown,
): { deck: CastleSiegeCard[]; discard: CastleSiegeCard[] } | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.remainingIds) || !Array.isArray(record.discardIds)) {
    return undefined;
  }
  const deck: CastleSiegeCard[] = [];
  const discard: CastleSiegeCard[] = [];
  for (const id of record.remainingIds) {
    if (typeof id !== "string") {
      return undefined;
    }
    const card = cardFromId(id);
    if (!card) {
      return undefined;
    }
    deck.push(card);
  }
  for (const id of record.discardIds) {
    if (typeof id !== "string") {
      return undefined;
    }
    const card = cardFromId(id);
    if (!card) {
      return undefined;
    }
    discard.push(card);
  }
  return { deck, discard };
}

export function serializeTurnState(turn: StandoffTurnState): Record<string, unknown> {
  return {
    round: turn.round,
    activeTeam: turn.activeTeam,
    actsInRound: turn.actsInRound,
    phase: turn.phase,
    deadlineMs: turn.deadlineMs,
    clocks: turn.clocks,
    lastWordArmedFor: turn.lastWordArmedFor,
    lastWordPending: turn.lastWordPending,
    duskReady: turn.duskReady,
  };
}

const TURN_PHASES = new Set(["turn", "answer", "postLastWord", "dusk"]);

export function deserializeTurnState(value: unknown): StandoffTurnState | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.round !== "number" ||
    (record.activeTeam !== "teamA" && record.activeTeam !== "teamB") ||
    typeof record.actsInRound !== "number" ||
    typeof record.phase !== "string" ||
    !TURN_PHASES.has(record.phase) ||
    typeof record.deadlineMs !== "number"
  ) {
    return undefined;
  }
  const clocks =
    record.clocks && typeof record.clocks === "object" && !Array.isArray(record.clocks)
      ? {
          turnSeconds:
            typeof (record.clocks as Record<string, unknown>).turnSeconds === "number"
              ? ((record.clocks as Record<string, unknown>).turnSeconds as number)
              : DEFAULT_STANDOFF_CLOCKS.turnSeconds,
          answerSeconds:
            typeof (record.clocks as Record<string, unknown>).answerSeconds === "number"
              ? ((record.clocks as Record<string, unknown>).answerSeconds as number)
              : DEFAULT_STANDOFF_CLOCKS.answerSeconds,
          photoAnswerSeconds:
            typeof (record.clocks as Record<string, unknown>).photoAnswerSeconds === "number"
              ? ((record.clocks as Record<string, unknown>).photoAnswerSeconds as number)
              : DEFAULT_STANDOFF_CLOCKS.photoAnswerSeconds,
        }
      : DEFAULT_STANDOFF_CLOCKS;

  return {
    round: record.round,
    activeTeam: record.activeTeam,
    actsInRound: record.actsInRound,
    phase: record.phase as StandoffTurnState["phase"],
    deadlineMs: record.deadlineMs,
    clocks,
    lastWordArmedFor:
      record.lastWordArmedFor === "teamA" || record.lastWordArmedFor === "teamB"
        ? record.lastWordArmedFor
        : null,
    lastWordPending: record.lastWordPending === true,
    duskReady: record.duskReady === true,
  };
}

/** Public session fields when host starts Standoff (no hand/deck ids). */
export function buildStartStandoffPublicPatch(
  nowMs: number,
  deckRemainingCount: number,
  opener: StandoffTeamId = "teamA",
): {
  phase: "standoff";
  standoffTurn: Record<string, unknown>;
  standoffDeckRemainingCount: number;
} {
  return {
    phase: "standoff",
    standoffTurn: serializeTurnState(
      createInitialStandoffTurn(nowMs, DEFAULT_STANDOFF_CLOCKS, opener),
    ),
    standoffDeckRemainingCount: deckRemainingCount,
  };
}

/** Private deck + empty hands for restricted subcollections. */
export function buildStartStandoffPrivateState(
  nowMs: number,
  seed = 1,
  opener: StandoffTeamId = "teamA",
): {
  deck: SerializedStandoffDeck;
  hands: SerializedStandoffHands;
  publicPatch: ReturnType<typeof buildStartStandoffPublicPatch>;
} {
  const deckCards = createShuffledDeck(seed);
  const deck = serializeDeckState(deckCards, []);
  return {
    deck,
    hands: { teamA: [], teamB: [] },
    publicPatch: buildStartStandoffPublicPatch(nowMs, deck.remainingIds.length, opener),
  };
}

/** @deprecated Prefer buildStartStandoffPrivateState for new writes. */
export function buildStartStandoffPatch(
  nowMs: number,
  seed = 1,
): {
  phase: "standoff";
  standoffTurn: Record<string, unknown>;
  standoffDeck: SerializedStandoffDeck;
  standoffHands: SerializedStandoffHands;
} {
  const { deck, hands, publicPatch } = buildStartStandoffPrivateState(nowMs, seed);
  return {
    phase: publicPatch.phase,
    standoffTurn: publicPatch.standoffTurn,
    standoffDeck: deck,
    standoffHands: hands,
  };
}

export function serializeHands(
  hands: Record<StandoffTeamId, CastleSiegeCard[]>,
): SerializedStandoffHands {
  return {
    teamA: hands.teamA.map((c) => c.id),
    teamB: hands.teamB.map((c) => c.id),
  };
}
