import { useId, useState } from "react";
import { MotionSheet } from "../../motion/MotionSheet";
import { SheetHeader } from "../../ui/sheets/SheetHeader";
import type {
  BoardCardInstance,
  PendingDrawPick,
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

type DrawPickSheetProps = {
  pending: PendingDrawPick | null;
  gameSize: GameSize;
  onConfirm: (keepInstanceIds: readonly string[]) => void;
};

export function DrawPickSheet({
  pending,
  gameSize,
  onConfirm,
}: DrawPickSheetProps) {
  if (!pending) {
    return null;
  }
  const cycleKey =
    pending.drawn.map((card) => card.instanceId).join("|") || "empty";
  return (
    <DrawPickSheetOpen
      key={cycleKey}
      pending={pending}
      gameSize={gameSize}
      onConfirm={onConfirm}
    />
  );
}

function DrawPickSheetOpen({
  pending,
  gameSize,
  onConfirm,
}: {
  pending: PendingDrawPick;
  gameSize: GameSize;
  onConfirm: (keepInstanceIds: readonly string[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const need = pending.keep;
  const cyclesLeft = pending.cyclesRemaining.length;

  const toggle = (instanceId: string) => {
    setError(null);
    setSelectedIds((prev) => {
      if (prev.includes(instanceId)) {
        return prev.filter((id) => id !== instanceId);
      }
      if (prev.length >= need) {
        return prev;
      }
      return [...prev, instanceId];
    });
  };

  return (
    <MotionSheet
      open
      onClose={() => undefined}
      ariaLabel="Choose cards to keep"
    >
      <SheetHeader
        title="Draw"
        eyebrow={
          cyclesLeft > 0
            ? `Keep ${need} · ${cyclesLeft} more draw${cyclesLeft === 1 ? "" : "s"} after this`
            : `Keep ${need} of ${pending.drawn.length}`
        }
        onClose={() => {
          /* Must finish the draw before closing. */
        }}
        closeLabel="Finish draw first"
      />
      <div className="space-y-3 px-4 pb-4">
        <p className="text-sm text-ink-muted">
          Pick which drawn cards to keep. The rest go to discard.
        </p>
        <ul className="space-y-2">
          {pending.drawn.map((card) => {
            const selected = selectedIds.includes(card.instanceId);
            return (
              <li key={card.instanceId}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggle(card.instanceId)}
                  className={`flex min-h-11 w-full items-center justify-between border-2 px-3 py-2 text-left text-sm ${
                    selected
                      ? "border-action bg-action/10 text-ink"
                      : "border-border bg-surface-raised text-ink-secondary"
                  }`}
                >
                  <span>{cardLabel(card, gameSize)}</span>
                  <span className="text-xs text-ink-muted">
                    {selected ? "Keep" : "Discard"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {error ? (
          <p id={errorId} role="alert" className="text-xs text-status-error">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          className="btn-primary min-h-11 w-full"
          onClick={() => {
            if (selectedIds.length !== need) {
              setError(`Select exactly ${need} card${need === 1 ? "" : "s"} to keep.`);
              return;
            }
            onConfirm(selectedIds);
            setSelectedIds([]);
            setError(null);
          }}
        >
          Confirm keep ({selectedIds.length}/{need})
        </button>
      </div>
    </MotionSheet>
  );
}
