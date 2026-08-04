import { MotionSheet } from "../../motion/MotionSheet";
import { SheetHeader } from "../../ui/sheets/SheetHeader";
import type {
  BoardCardInstance,
  BoardEconomyState,
  PowerUpId,
} from "../../../domain/boardEconomy";
import { timeBonusMinutesForGameSize } from "../../../domain/boardEconomy";
import type { GameSize } from "../../../domain/session/size/gameSize";

function cardLabel(card: BoardCardInstance, gameSize: GameSize): string {
  switch (card.def.kind) {
    case "timeBonus":
      return `Time +${timeBonusMinutesForGameSize(card.def.durations, gameSize)} min`;
    case "powerUp":
      return `Power-up: ${card.def.id}`;
    case "curse":
      return `Curse: ${card.def.id}`;
    case "move":
      return "Move";
    default: {
      const _exhaustive: never = card.def;
      return _exhaustive;
    }
  }
}

export function HiderHandSheet({
  open,
  onClose,
  state,
  gameSize,
  mustDiscard,
  onDiscard,
  onPlayExpand,
  onPlayCurse,
  onClearCurse,
  onPlayMove,
}: {
  open: boolean;
  onClose: () => void;
  state: BoardEconomyState;
  gameSize: GameSize;
  mustDiscard: number;
  onDiscard: (instanceId: string) => void;
  onPlayExpand: (instanceId: string, id: "expandHand1" | "expandHand2") => void;
  onPlayCurse: (instanceId: string) => void;
  onClearCurse: (instanceId: string) => void;
  onPlayMove: (instanceId: string) => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <MotionSheet
      open={open}
      onClose={onClose}
      ariaLabel="Hider hand"
      sheetClassName="mx-auto max-w-lg"
      maxHeightClassName="max-h-[min(70dvh,560px)]"
    >
      <SheetHeader title="Hider hand" onClose={onClose} />
      <div className="space-y-3">
        <p className="text-sm text-ink-secondary">
          {state.hand.length} / {state.handLimit} cards
          {mustDiscard > 0
            ? ` — discard or play ${mustDiscard} more`
            : ""}
        </p>
        <ul className="space-y-2">
          {state.hand.map((card) => {
            const expandId =
              card.def.kind === "powerUp" &&
              (card.def.id === "expandHand1" || card.def.id === "expandHand2")
                ? (card.def.id as Extract<PowerUpId, "expandHand1" | "expandHand2">)
                : null;
            return (
              <li
                key={card.instanceId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-hud-md)] border border-border px-3 py-2"
              >
                <span className="text-sm text-ink">
                  {cardLabel(card, gameSize)}
                </span>
                <span className="flex flex-wrap gap-2">
                  {mustDiscard > 0 ? (
                    <button
                      type="button"
                      className="min-h-11 px-2 text-sm text-ink-secondary underline"
                      onClick={() => onDiscard(card.instanceId)}
                    >
                      Discard
                    </button>
                  ) : null}
                  {expandId ? (
                    <button
                      type="button"
                      className="min-h-11 px-2 text-sm text-ink-secondary underline"
                      onClick={() => onPlayExpand(card.instanceId, expandId)}
                    >
                      Play
                    </button>
                  ) : null}
                  {card.def.kind === "curse" ? (
                    <button
                      type="button"
                      className="min-h-11 px-2 text-sm text-ink-secondary underline"
                      onClick={() => onPlayCurse(card.instanceId)}
                    >
                      Play curse
                    </button>
                  ) : null}
                  {card.def.kind === "move" ? (
                    <button
                      type="button"
                      className="min-h-11 px-2 text-sm text-ink-secondary underline"
                      onClick={() => onPlayMove(card.instanceId)}
                    >
                      Play move
                    </button>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
        {state.activeCurses.filter((c) => !c.cleared).length > 0 ? (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
              Active curses
            </p>
            <ul className="space-y-2">
              {state.activeCurses
                .filter((c) => !c.cleared)
                .map((c) => (
                  <li
                    key={c.instanceId}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span>{c.curseId}</span>
                    <button
                      type="button"
                      className="min-h-11 px-2 text-ink-secondary underline"
                      onClick={() => onClearCurse(c.instanceId)}
                    >
                      Mark cleared
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </div>
    </MotionSheet>
  );
}
