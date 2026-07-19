import { useEffect, useId, useState } from "react";
import {
  USERNAME_MAX_LENGTH,
  validateUsername,
} from "../../domain/game/playerProfile";
import { claimUsername } from "../../services/profile/claimUsername";
import { InlineError } from "../ui/InlineError";
import { TextField } from "../ui/TextField";

interface UsernameSetupGateProps {
  onClaimed?: (username: string) => void;
  description?: string;
}

export function UsernameSetupGate({
  onClaimed,
  description = "Pick a unique username to appear on friends lists and leaderboards.",
}: UsernameSetupGateProps) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();
  const inputId = "username-claim";

  useEffect(() => {
    document.getElementById(inputId)?.focus();
  }, []);

  const handleClaim = async () => {
    const validated = validateUsername(value);
    if (!validated.ok) {
      setError(validated.error);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await claimUsername(validated.username);
      onClaimed?.(result.username);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Could not claim username.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="desktop-entry-actions space-y-3 border-t-2 border-border pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        void handleClaim();
      }}
    >
      <div className="space-y-1">
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.08em] text-ink">
          Choose a username
        </h2>
        <p className="text-sm leading-relaxed text-ink-muted">{description}</p>
        <p className="text-xs leading-relaxed text-ink-muted">
          Letters, numbers, underscore. Unique. 3–{USERNAME_MAX_LENGTH}{" "}
          characters. This cannot be changed later.
        </p>
      </div>

      {error ? <InlineError id={errorId}>{error}</InlineError> : null}

      <TextField
        id={inputId}
        label="Username"
        labelClassName="field-label font-display text-xs uppercase tracking-[0.1em]"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setError(null);
        }}
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={USERNAME_MAX_LENGTH}
        disabled={busy}
        placeholder="seeker_one"
        aria-invalid={error != null}
        aria-describedby={error ? errorId : undefined}
      />

      <button
        type="submit"
        disabled={busy || value.trim().length === 0}
        className="home-card-btn w-full disabled:opacity-50"
      >
        <span>{busy ? "Claiming…" : "Claim username"}</span>
        <span className="home-card-btn-hint">Unique · permanent</span>
      </button>
    </form>
  );
}
