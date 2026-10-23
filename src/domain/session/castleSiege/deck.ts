/** Pure Standoff deck: 36-card catalog, shuffle, draw-keep, hand limit, reshuffle. */

export const CASTLE_SIEGE_DECK_SIZE = 36;
export const CASTLE_SIEGE_QUESTION_COUNT = 28;
export const CASTLE_SIEGE_POWER_COUNT = 8;
export const CASTLE_SIEGE_HAND_LIMIT = 5;

export type QuestionTool = "radar" | "compass" | "matching" | "measuring" | "tentacles" | "photo";

export type PowerKind = "spyglass" | "doubleTime" | "quartermaster";

export type CastleSiegeCard =
  | { id: string; kind: "question"; tool: QuestionTool }
  | { id: string; kind: "power"; power: PowerKind };

const QUESTION_COUNTS: Record<QuestionTool, number> = {
  radar: 5,
  compass: 5,
  matching: 5,
  measuring: 5,
  tentacles: 4,
  photo: 4,
};

const POWER_COUNTS: Record<PowerKind, number> = {
  spyglass: 3,
  doubleTime: 3,
  quartermaster: 2,
};

/** Fixed catalog (ids stable for tests / persistence). */
export function buildCastleSiegeCatalog(): CastleSiegeCard[] {
  const cards: CastleSiegeCard[] = [];
  for (const [tool, count] of Object.entries(QUESTION_COUNTS) as [QuestionTool, number][]) {
    for (let i = 1; i <= count; i += 1) {
      cards.push({ id: `q-${tool}-${i}`, kind: "question", tool });
    }
  }
  for (const [power, count] of Object.entries(POWER_COUNTS) as [PowerKind, number][]) {
    for (let i = 1; i <= count; i += 1) {
      cards.push({ id: `p-${power}-${i}`, kind: "power", power });
    }
  }
  return cards;
}

/** Mulberry32 for deterministic shuffle from a seed. */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function createShuffledDeck(seed = 1): CastleSiegeCard[] {
  const deck = [...buildCastleSiegeCatalog()];
  const rand = mulberry32(seed);
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = deck[i]!;
    deck[i] = deck[j]!;
    deck[j] = tmp;
  }
  return deck;
}

export function drawCards(
  deck: CastleSiegeCard[],
  count: number,
): { drawn: CastleSiegeCard[]; remaining: CastleSiegeCard[] } {
  if (count < 0 || count > deck.length) {
    throw new Error(`Cannot draw ${count} from deck of ${deck.length}`);
  }
  return {
    drawn: deck.slice(0, count),
    remaining: deck.slice(count),
  };
}

export function drawKeep(
  drawn: CastleSiegeCard[],
  keepIds: string[],
  existingHand: CastleSiegeCard[] = [],
): { kept: CastleSiegeCard[]; discarded: CastleSiegeCard[] } {
  const keepSet = new Set(keepIds);
  if (keepSet.size !== keepIds.length) {
    throw new Error("Duplicate keep ids");
  }
  for (const id of keepSet) {
    if (!drawn.some((c) => c.id === id)) {
      throw new Error(`Keep id not in drawn: ${id}`);
    }
  }
  const kept = drawn.filter((c) => keepSet.has(c.id));
  const discarded = drawn.filter((c) => !keepSet.has(c.id));
  if (existingHand.length + kept.length > CASTLE_SIEGE_HAND_LIMIT) {
    throw new Error(`Hand limit ${CASTLE_SIEGE_HAND_LIMIT}`);
  }
  return { kept, discarded };
}

export function playCardFromHand(
  hand: CastleSiegeCard[],
  cardId: string,
): { nextHand: CastleSiegeCard[]; discarded: CastleSiegeCard } {
  const index = hand.findIndex((c) => c.id === cardId);
  if (index < 0) {
    throw new Error(`Card not in hand: ${cardId}`);
  }
  const discarded = hand[index]!;
  return {
    nextHand: [...hand.slice(0, index), ...hand.slice(index + 1)],
    discarded,
  };
}

export function reshuffleDiscardIntoDeck(
  deck: CastleSiegeCard[],
  discard: CastleSiegeCard[],
  seed = 1,
): { deck: CastleSiegeCard[]; discard: CastleSiegeCard[] } {
  if (deck.length > 0) {
    return { deck, discard };
  }
  if (discard.length === 0) {
    return { deck: [], discard: [] };
  }
  const combined = [...discard];
  const rand = mulberry32(seed);
  for (let i = combined.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = combined[i]!;
    combined[i] = combined[j]!;
    combined[j] = tmp;
  }
  return { deck: combined, discard: [] };
}
