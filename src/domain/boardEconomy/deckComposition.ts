import type {
  BoardCardDef,
  CurseCardDef,
  PowerUpCardDef,
  TimeBonusCardDef,
  TimeBonusDurations,
} from "./types";

const TIME_ROWS: readonly {
  id: TimeBonusCardDef["id"];
  count: number;
  durations: TimeBonusDurations;
}[] = [
  { id: "time-1", count: 25, durations: [2, 3, 5] },
  { id: "time-2", count: 15, durations: [4, 6, 10] },
  { id: "time-3", count: 10, durations: [6, 9, 15] },
  { id: "time-4", count: 3, durations: [8, 12, 20] },
  { id: "time-5", count: 2, durations: [12, 18, 30] },
];

const POWER_ROWS: readonly { id: PowerUpCardDef["id"]; count: number }[] = [
  { id: "randomize", count: 4 },
  { id: "veto", count: 4 },
  { id: "duplicate", count: 2 },
  { id: "discard1Draw2", count: 4 },
  { id: "discard2Draw3", count: 4 },
  { id: "expandHand1", count: 2 },
];

/** Base-game curse ids (24). Expansion curses are separate. */
export const BASE_CURSE_IDS = [
  "zoologist",
  "unguided-tourist",
  "endless-tumble",
  "hidden-hangman",
  "overflowing-chalice",
  "mediocre-travel-agent",
  "luxury-car",
  "u-turn",
  "bridge-troll",
  "water-weight",
  "jammed-door",
  "cairn",
  "urban-explorer",
  "impressionable-consumer",
  "egg-partner",
  "distant-cuisine",
  "right-turn",
  "labyrinth",
  "bird-guide",
  "spotty-memory",
  "lemon-phylactery",
  "drained-brain",
  "ransom-note",
  "gamblers-feet",
] as const;

function expandCount<T>(count: number, make: () => T): T[] {
  return Array.from({ length: count }, make);
}

/** Exact base hider-deck multiset (100 cards). See hider-deck.md. */
export const HIDER_DECK_TEMPLATE: readonly BoardCardDef[] = Object.freeze([
  ...TIME_ROWS.flatMap(({ id, count, durations }) =>
    expandCount(
      count,
      (): TimeBonusCardDef => ({ kind: "timeBonus", id, durations }),
    ),
  ),
  ...POWER_ROWS.flatMap(({ id, count }) =>
    expandCount(count, (): PowerUpCardDef => ({ kind: "powerUp", id })),
  ),
  { kind: "move", id: "move" } as const,
  ...BASE_CURSE_IDS.map(
    (id): CurseCardDef => ({
      kind: "curse",
      id,
    }),
  ),
]);

export const HIDER_DECK_SIZE = HIDER_DECK_TEMPLATE.length;
