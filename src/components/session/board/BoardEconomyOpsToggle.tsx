import { FirebaseError } from "firebase/app";
import { useId, useState } from "react";
import { updateBoardEconomyEnabled } from "../../../services/firestore/boardEconomy";

function boardEconomyUpdateErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Could not update board economy (permission denied). Enable only before the hide timer starts, as ops admin, while you are a session member.";
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return "Could not update board economy flag.";
}

/** Ops-admin only. Must not render unless useAdminAccessState().state === "admin". */
export function BoardEconomyOpsToggle({
  sessionId,
  enabled,
  disabled,
  disabledReason,
  onChanged,
}: {
  sessionId: string;
  enabled: boolean;
  disabled?: boolean;
  /** When set, shown instead of the default helper (e.g. timer already started). */
  disabledReason?: string | null;
  onChanged?: (next: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const hintId = useId();
  const locked = Boolean(disabled) || pending;
  const hint = disabledReason?.trim() || null;

  return (
    <fieldset
      disabled={locked}
      className="space-y-2 rounded-[var(--radius-hud-md)] border border-border p-3 disabled:opacity-50"
    >
      <legend className="px-1 font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
        Ops · board economy
      </legend>
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          disabled={locked}
          aria-describedby={
            [error ? errorId : null, hint ? hintId : null]
              .filter(Boolean)
              .join(" ") || undefined
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
      <p id={hint ? hintId : undefined} className="text-xs text-ink-muted">
        {hint ??
          "Default off. Only your ops admin account can enable this before the hide timer starts. Public hosts never see this control."}
      </p>
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-status-error">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
