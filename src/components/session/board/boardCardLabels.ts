import type { BoardCardInstance } from "../../../domain/boardEconomy";
import { timeBonusMinutesForGameSize } from "../../../domain/boardEconomy";
import type { GameSize } from "../../../domain/session/size/gameSize";

const POWER_UP_LABELS: Record<string, string> = {
  veto: "Veto",
  randomize: "Randomize",
  duplicate: "Duplicate",
  discard1Draw2: "Discard 1, draw 2",
  discard2Draw3: "Discard 2, draw 3",
  discard3Draw4: "Discard 3, draw 4",
  expandHand1: "Draw 1, expand hand +1",
  expandHand2: "Draw 1, expand hand +2",
};

export function boardCardLabel(
  card: BoardCardInstance,
  gameSize: GameSize,
): string {
  switch (card.def.kind) {
    case "timeBonus":
      return `Time +${timeBonusMinutesForGameSize(card.def.durations, gameSize)} min`;
    case "powerUp":
      return POWER_UP_LABELS[card.def.id] ?? card.def.id;
    case "curse":
      return `Curse of ${card.def.id.replace(/-/g, " ")}`;
    case "move":
      return "Move";
    default: {
      const _exhaustive: never = card.def;
      return _exhaustive;
    }
  }
}
