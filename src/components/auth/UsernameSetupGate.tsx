import { useEffect, useId, useState } from "react";
import { Button, Stack, Text, TextInput } from "@mantine/core";
import {
  USERNAME_MAX_LENGTH,
  validateUsername,
} from "../../domain/game/playerProfile";
import { claimUsername } from "../../services/profile/claimUsername";
import {
  IosErrorCallout,
  IosFieldError,
  IosInsetGroup,
  IosSectionLabel,
  iosFilledStyles,
} from "../ui/apple/iosEntryChrome";
import { InlineError } from "../ui/banners/InlineError";
import { TextField } from "../ui/forms/TextField";

interface UsernameSetupGateProps {
  onClaimed?: (username: string) => void;
  description?: string;
  chrome?: "survey" | "ios";
}

export function UsernameSetupGate({
  onClaimed,
  description = "Pick a unique username to appear on friends lists and leaderboards.",
  chrome = "survey",
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

  if (chrome === "ios") {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleClaim();
        }}
      >
        <Stack gap={22}>
          <Stack gap={8}>
            <IosSectionLabel>Choose a username</IosSectionLabel>
            <Text
              size="sm"
              c="var(--color-field-ink-muted)"
              style={{ lineHeight: 1.4, textWrap: "pretty" }}
              px={4}
            >
              {description}
            </Text>
            <IosInsetGroup error={Boolean(error)}>
              <TextInput
                id={inputId}
                aria-label="Username"
                aria-invalid={error != null}
                aria-describedby={error ? errorId : undefined}
                value={value}
                onChange={(event) => {
                  setValue(event.currentTarget.value);
                  setError(null);
                }}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={USERNAME_MAX_LENGTH}
                disabled={busy}
                placeholder="seeker_one"
                error={undefined}
                styles={{
                  input: {
                    border: "none",
                    background: "transparent",
                    minHeight: "3.25rem",
                    color: "var(--color-field-ink)",
                    fontSize: "1.0625rem",
                    paddingInline: "1rem",
                  },
                }}
              />
            </IosInsetGroup>
            <IosFieldError id={errorId}>{error}</IosFieldError>
            <Text size="xs" c="var(--color-field-ink-muted)" px={4}>
              Letters, numbers, underscore · 3–{USERNAME_MAX_LENGTH} characters ·
              permanent
            </Text>
          </Stack>
          <Button
            type="submit"
            fullWidth
            disabled={busy || value.trim().length === 0}
            loading={busy}
            styles={iosFilledStyles}
          >
            {busy ? "Claiming…" : "Claim username"}
          </Button>
        </Stack>
      </form>
    );
  }

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
