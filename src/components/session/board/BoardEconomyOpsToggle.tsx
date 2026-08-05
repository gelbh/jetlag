import { FirebaseError } from "firebase/app";
import { useId, useState } from "react";
import { updateBoardEconomyEnabled } from "../../../services/firestore/boardEconomy";

function boardEconomyUpdateErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Could not update board hand (permission denied). Enable only before the hide timer starts, as the session host.";
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Could not update board hand flag.";
}

const TIMER_LOCKED_HINT =
  "Hide timer already started — board hand can only be toggled before the timer runs (including a 0:00 running clock).";

const DEFAULT_HINT =
  "Default off. Host can enable this in Advanced rules before the hide timer starts.";

/** Host-facing board-economy toggle (legacy surface; prefer Advanced rules). */
export function BoardEconomyOpsToggle({
  sessionId,
  enabled,
  disabled,
  onChanged,
}: {
  sessionId: string;
  enabled: boolean;
  disabled?: boolean;
  onChanged?: (next: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const hintId = useId();
  const locked = Boolean(disabled) || pending;

  return (
    <fieldset
      disabled={locked}
      className="space-y-2 rounded-[var(--radius-hud-md)] border border-border p-3 disabled:opacity-50"
    >
      <legend className="px-1 font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
        Board hand
      </legend>
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          disabled={locked}
          aria-describedby={
            [error ? errorId : null, hintId].filter(Boolean).join(" ")
          }
          onChange={(event) => {
            const next = event.target.checked;
            setPending(true);
            setError(null);
            void updateBoardEconomyEnabled(sessionId, next)
              .then(() => onChanged?.(next))
              .catch((caught: unknown) =>
                setError(boardEconomyUpdateErrorMessage(caught)),
              )
              .finally(() => setPending(false));
          }}
          className="h-4 w-4"
        />
        <span className="text-sm text-ink-secondary">
          Simulate hider deck (hand, rewards, power-ups)
        </span>
      </label>
      <p id={hintId} className="text-xs text-ink-muted">
        {disabled ? TIMER_LOCKED_HINT : DEFAULT_HINT}
      </p>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-status-error">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
