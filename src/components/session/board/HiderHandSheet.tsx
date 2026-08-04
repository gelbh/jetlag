import { useEffect, useId, useState } from "react";
import { MotionSheet } from "../../motion/MotionSheet";
import { SheetHeader } from "../../ui/sheets/SheetHeader";
import type {
  BoardCardInstance,
  BoardEconomyState,
  PowerUpId,
} from "../../../domain/boardEconomy";
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

function cardLabel(card: BoardCardInstance, gameSize: GameSize): string {
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

function discardNeed(id: PowerUpId): number | null {
  switch (id) {
    case "discard1Draw2":
      return 1;
    case "discard2Draw3":
      return 2;
    case "discard3Draw4":
      return 3;
    case "veto":
    case "randomize":
    case "duplicate":
    case "expandHand1":
    case "expandHand2":
      return null;
    default: {
      const _exhaustive: never = id;
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
  onPlayDiscardDraw,
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
  onPlayDiscardDraw: (
    powerUpInstanceId: string,
    discardInstanceIds: readonly string[],
    drawN: number,
  ) => void;
  onPlayCurse: (instanceId: string) => void;
  onClearCurse: (instanceId: string) => void;
  onPlayMove: (instanceId: string) => void;
}) {
  const [pendingDiscardDraw, setPendingDiscardDraw] = useState<{
    powerUpInstanceId: string;
    need: number;
    drawN: number;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const errorId = useId();

  useEffect(() => {
    if (!open) {
      setPendingDiscardDraw(null);
      setSelectedIds([]);
      setActionError(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const toggleSelect = (instanceId: string) => {
    setSelectedIds((prev) =>
      prev.includes(instanceId)
        ? prev.filter((id) => id !== instanceId)
        : [...prev, instanceId],
    );
  };

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
        {pendingDiscardDraw ? (
          <p className="text-sm text-ink-secondary" role="status">
            Select {pendingDiscardDraw.need} card
            {pendingDiscardDraw.need === 1 ? "" : "s"} to discard (
            {selectedIds.length}/{pendingDiscardDraw.need}), then confirm.
          </p>
        ) : null}
        {actionError ? (
          <p
            id={errorId}
            role="alert"
            className="text-sm text-status-error"
          >
            {actionError}
          </p>
        ) : null}
        <ul className="space-y-2">
          {state.hand.map((card) => {
            const expandId =
              card.def.kind === "powerUp" &&
              (card.def.id === "expandHand1" || card.def.id === "expandHand2")
                ? (card.def.id as Extract<PowerUpId, "expandHand1" | "expandHand2">)
                : null;
            const discardNeedCount =
              card.def.kind === "powerUp" ? discardNeed(card.def.id) : null;
            const selecting = pendingDiscardDraw !== null;
            const isPowerUpBeingPlayed =
              pendingDiscardDraw?.powerUpInstanceId === card.instanceId;
            const selectable =
              selecting && !isPowerUpBeingPlayed;
            const selected = selectedIds.includes(card.instanceId);

            return (
              <li
                key={card.instanceId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-hud-md)] border border-border px-3 py-2"
              >
                <label className="flex min-h-11 flex-1 items-center gap-2 text-sm text-ink">
                  {selectable ? (
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSelect(card.instanceId)}
                      className="h-4 w-4"
                    />
                  ) : null}
                  {cardLabel(card, gameSize)}
                </label>
                <span className="flex flex-wrap gap-2">
                  {mustDiscard > 0 && !selecting ? (
                    <button
                      type="button"
                      className="min-h-11 px-2 text-sm text-ink-secondary underline"
                      onClick={() => onDiscard(card.instanceId)}
                    >
                      Discard
                    </button>
                  ) : null}
                  {!selecting && expandId ? (
                    <button
                      type="button"
                      className="min-h-11 px-2 text-sm text-ink-secondary underline"
                      onClick={() => onPlayExpand(card.instanceId, expandId)}
                    >
                      Play
                    </button>
                  ) : null}
                  {!selecting && discardNeedCount !== null ? (
                    <button
                      type="button"
                      className="min-h-11 px-2 text-sm text-ink-secondary underline"
                      onClick={() => {
                        const others = state.hand.filter(
                          (c) => c.instanceId !== card.instanceId,
                        ).length;
                        if (others < discardNeedCount) {
                          setActionError(
                            `Need ${discardNeedCount} other card(s) in hand to discard.`,
                          );
                          return;
                        }
                        setActionError(null);
                        setPendingDiscardDraw({
                          powerUpInstanceId: card.instanceId,
                          need: discardNeedCount,
                          drawN: discardNeedCount + 1,
                        });
                        setSelectedIds([]);
                      }}
                    >
                      Play
                    </button>
                  ) : null}
                  {!selecting && card.def.kind === "curse" ? (
                    <button
                      type="button"
                      className="min-h-11 px-2 text-sm text-ink-secondary underline"
                      onClick={() => onPlayCurse(card.instanceId)}
                    >
                      Play curse
                    </button>
                  ) : null}
                  {!selecting && card.def.kind === "move" ? (
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
        {pendingDiscardDraw ? (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary min-h-11 flex-1"
              onClick={() => {
                setPendingDiscardDraw(null);
                setSelectedIds([]);
                setActionError(null);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary min-h-11 flex-1"
              disabled={selectedIds.length !== pendingDiscardDraw.need}
              onClick={() => {
                onPlayDiscardDraw(
                  pendingDiscardDraw.powerUpInstanceId,
                  selectedIds,
                  pendingDiscardDraw.drawN,
                );
                setPendingDiscardDraw(null);
                setSelectedIds([]);
                setActionError(null);
              }}
            >
              Confirm discard
            </button>
          </div>
        ) : null}
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
