import type { QuestionCardCost } from "../map/mapTools";
import { HIDER_DECK_TEMPLATE } from "./deckComposition";
import type {
  BoardCardDef,
  BoardCardInstance,
  BoardEconomyState,
  DrawKeepCycle,
  PowerUpId,
} from "./types";
import { DEFAULT_HAND_LIMIT } from "./types";

/** Deterministic mulberry32 from string seed. */
export function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cloneDef(def: BoardCardDef): BoardCardDef {
  switch (def.kind) {
    case "timeBonus":
      return { kind: "timeBonus", id: def.id, durations: [...def.durations] };
    case "powerUp":
      return { kind: "powerUp", id: def.id };
    case "curse":
      return { kind: "curse", id: def.id };
    case "move":
      return { kind: "move", id: "move" };
    default: {
      const _exhaustive: never = def;
      return _exhaustive;
    }
  }
}

function instanceId(seed: string, index: number): string {
  return `${seed}:${index}`;
}

export function createShuffledDeck(seed: string): BoardCardInstance[] {
  const rng = mulberry32(hashSeed(seed));
  const cards: BoardCardInstance[] = HIDER_DECK_TEMPLATE.map((def, index) => ({
    instanceId: instanceId(seed, index),
    def: cloneDef(def),
  }));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = cards[i]!;
    cards[i] = cards[j]!;
    cards[j] = tmp;
  }
  return cards;
}

export function createInitialBoardEconomyState(seed: string): BoardEconomyState {
  return {
    deck: createShuffledDeck(seed),
    hand: [],
    discard: [],
    handLimit: DEFAULT_HAND_LIMIT,
    activeCurses: [],
  };
}

/**
 * Draw `drawN` from deck top; keep first `keepM`.
 * v1 simplification: keep order is deck order (no interactive pick UI yet).
 * Caller may reorder `drawn` before a future choose-keep API.
 */
export function drawKeep(
  deck: readonly BoardCardInstance[],
  hand: readonly BoardCardInstance[],
  drawN: number,
  keepM: number,
): {
  deck: BoardCardInstance[];
  hand: BoardCardInstance[];
  discarded: BoardCardInstance[];
  drawn: BoardCardInstance[];
} {
  const nextDeck = [...deck];
  const drawn: BoardCardInstance[] = [];
  for (let i = 0; i < drawN && nextDeck.length > 0; i++) {
    drawn.push(nextDeck.shift()!);
  }
  const keep = Math.min(keepM, drawn.length);
  const kept = drawn.slice(0, keep);
  const discarded = drawn.slice(keep);
  return {
    deck: nextDeck,
    hand: [...hand, ...kept],
    discarded,
    drawn,
  };
}

export function enforceHandLimit(
  hand: readonly BoardCardInstance[],
  max: number = DEFAULT_HAND_LIMIT,
): { hand: BoardCardInstance[]; mustDiscard: number } {
  if (hand.length <= max) {
    return { hand: [...hand], mustDiscard: 0 };
  }
  return { hand: [...hand], mustDiscard: hand.length - max };
}

/**
 * Sequential reward cycles for reuse: D3P1 with useCount 1 → two {3,1}
 * cycles, never one combined {6,2}.
 */
export function rewardForQuestion(
  baseCost: QuestionCardCost,
  useCount: number,
): { cycles: DrawKeepCycle[] } {
  const base: Record<QuestionCardCost, DrawKeepCycle> = {
    D3P1: { draw: 3, keep: 1 },
    D2P1: { draw: 2, keep: 1 },
    D4P2: { draw: 4, keep: 2 },
    D1P1: { draw: 1, keep: 1 },
  };
  const cycle = base[baseCost];
  const times = Math.max(1, useCount + 1);
  return {
    cycles: Array.from({ length: times }, () => ({ ...cycle })),
  };
}

export function applySequentialRewards(
  state: BoardEconomyState,
  cycles: readonly DrawKeepCycle[],
): {
  state: BoardEconomyState;
  discarded: BoardCardInstance[];
} {
  let deck = [...state.deck];
  let hand = [...state.hand];
  const discarded: BoardCardInstance[] = [];
  for (const cycle of cycles) {
    const result = drawKeep(deck, hand, cycle.draw, cycle.keep);
    deck = result.deck;
    hand = result.hand;
    discarded.push(...result.discarded);
  }
  return {
    state: {
      ...state,
      deck,
      hand,
      discard: [...state.discard, ...discarded],
    },
    discarded,
  };
}

export function discardFromHand(
  state: BoardEconomyState,
  instanceIds: readonly string[],
): BoardEconomyState {
  const idSet = new Set(instanceIds);
  const kept: BoardCardInstance[] = [];
  const removed: BoardCardInstance[] = [];
  for (const card of state.hand) {
    if (idSet.has(card.instanceId)) {
      removed.push(card);
    } else {
      kept.push(card);
    }
  }
  return {
    ...state,
    hand: kept,
    discard: [...state.discard, ...removed],
  };
}

export function handLimitAfterExpand(
  currentLimit: number,
  powerUpId: PowerUpId,
): number {
  switch (powerUpId) {
    case "expandHand1":
      return currentLimit + 1;
    case "expandHand2":
      return currentLimit + 2;
    case "veto":
    case "randomize":
    case "duplicate":
    case "discard1Draw2":
    case "discard2Draw3":
    case "discard3Draw4":
      return currentLimit;
    default: {
      const _exhaustive: never = powerUpId;
      return _exhaustive;
    }
  }
}

export function playExpandHand(
  state: BoardEconomyState,
  instanceId: string,
  powerUpId: Extract<PowerUpId, "expandHand1" | "expandHand2">,
): BoardEconomyState {
  const card = state.hand.find((c) => c.instanceId === instanceId);
  if (!card || card.def.kind !== "powerUp" || card.def.id !== powerUpId) {
    return state;
  }
  let next = discardFromHand(state, [instanceId]);
  next = {
    ...next,
    handLimit: handLimitAfterExpand(next.handLimit, powerUpId),
  };
  // Both expand cards draw/keep 1 (rulebook: "Draw 1, expand …").
  const result = drawKeep(next.deck, next.hand, 1, 1);
  return {
    ...next,
    deck: result.deck,
    hand: result.hand,
    discard: [...next.discard, ...result.discarded],
  };
}

export function playDiscardDrawPowerUp(
  state: BoardEconomyState,
  powerUpInstanceId: string,
  discardInstanceIds: readonly string[],
  drawN: number,
): BoardEconomyState {
  const powerUp = state.hand.find((c) => c.instanceId === powerUpInstanceId);
  if (!powerUp || powerUp.def.kind !== "powerUp") {
    return state;
  }
  const requiredDiscard =
    powerUp.def.id === "discard1Draw2"
      ? 1
      : powerUp.def.id === "discard2Draw3"
        ? 2
        : powerUp.def.id === "discard3Draw4"
          ? 3
          : -1;
  if (requiredDiscard < 0 || discardInstanceIds.length !== requiredDiscard) {
    return state;
  }
  const next = discardFromHand(state, [
    powerUpInstanceId,
    ...discardInstanceIds,
  ]);
  const result = drawKeep(next.deck, next.hand, drawN, drawN);
  return {
    ...next,
    deck: result.deck,
    hand: result.hand,
    discard: [...next.discard, ...result.discarded],
  };
}

export function playMoveCard(
  state: BoardEconomyState,
  moveInstanceId: string,
): BoardEconomyState {
  const move = state.hand.find((c) => c.instanceId === moveInstanceId);
  if (!move || move.def.kind !== "move") {
    return state;
  }
  return {
    ...state,
    hand: [],
    discard: [...state.discard, ...state.hand],
    handLimit: DEFAULT_HAND_LIMIT,
  };
}

export function playCurse(
  state: BoardEconomyState,
  curseInstanceId: string,
  playedAt: string,
): BoardEconomyState {
  const curse = state.hand.find((c) => c.instanceId === curseInstanceId);
  if (!curse || curse.def.kind !== "curse") {
    return state;
  }
  const next = discardFromHand(state, [curseInstanceId]);
  return {
    ...next,
    activeCurses: [
      ...next.activeCurses,
      {
        instanceId: curse.instanceId,
        curseId: curse.def.id,
        playedAt,
        cleared: false,
      },
    ],
  };
}

export function markCurseCleared(
  state: BoardEconomyState,
  curseInstanceId: string,
  clearedAt: string,
): BoardEconomyState {
  return {
    ...state,
    activeCurses: state.activeCurses.map((c) =>
      c.instanceId === curseInstanceId
        ? { ...c, cleared: true, clearedAt }
        : c,
    ),
  };
}
