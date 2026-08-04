import { useState } from "react";
import { updateBoardEconomyEnabled } from "../../../services/firestore/boardEconomy";

/** Ops-admin only. Must not render unless useAdminAccessState().state === "admin". */
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

  return (
    <fieldset
      disabled={disabled || pending}
      className="space-y-2 rounded-[var(--radius-hud-md)] border border-border p-3 disabled:opacity-50"
    >
      <legend className="px-1 font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim">
        Ops · board economy
      </legend>
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          checked={enabled}
          disabled={disabled || pending}
          onChange={(event) => {
            const next = event.target.checked;
            setPending(true);
            setError(null);
            void updateBoardEconomyEnabled(sessionId, next)
              .then(() => onChanged?.(next))
              .catch(() =>
                setError("Could not update board economy flag (ops admin only)."),
              )
              .finally(() => setPending(false));
          }}
          className="h-4 w-4"
        />
        <span className="text-sm text-ink-secondary">
          Simulate hider deck (hand, rewards, power-ups)
        </span>
      </label>
      <p className="text-xs text-ink-muted">
        Default off. Only your ops admin account can enable this. Public hosts
        never see this control.
      </p>
      {error ? <p className="text-xs text-status-error">{error}</p> : null}
    </fieldset>
  );
}
