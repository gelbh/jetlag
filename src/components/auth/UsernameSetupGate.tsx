import { useEffect, useId, useState } from "react";
import { Stack, Text, TextInput } from "@mantine/core";
import { EntryAsyncButton } from "@/components/ui/entry/EntryAsyncButton";
import {
  USERNAME_MAX_LENGTH,
  validateUsername,
} from "../../domain/game/playerProfile";
import { claimUsername } from "../../services/profile/claimUsername";
import {
  FieldError,
  InsetGroup,
  SectionLabel,
} from "../ui/entry/entryChrome";
import { filledStyles } from "../ui/entry/entryStyles";

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
    if (busy) {
      return;
    }

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
      onSubmit={(event) => {
        event.preventDefault();
        void handleClaim();
      }}
    >
      <Stack gap={22}>
        <Stack gap={8}>
          <SectionLabel>Choose a username</SectionLabel>
          <Text
            size="sm"
            c="var(--color-field-ink-muted)"
            style={{ lineHeight: 1.4, textWrap: "pretty" }}
            px={4}
          >
            {description}
          </Text>
          <InsetGroup error={Boolean(error)}>
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
          </InsetGroup>
          <FieldError id={errorId}>{error}</FieldError>
          <Text size="xs" c="var(--color-field-ink-muted)" px={4}>
            Letters, numbers, underscore · 3–{USERNAME_MAX_LENGTH} characters ·
            permanent
          </Text>
        </Stack>
        <EntryAsyncButton
          type="submit"
          fullWidth
          busy={busy}
          unavailable={value.trim().length === 0}
          idleLabel="Claim username"
          busyLabel="Claiming…"
          styles={filledStyles}
        />
      </Stack>
    </form>
  );
}
