import { Box, SegmentedControl, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { EntryAsyncButton } from "@/components/ui/entry/EntryAsyncButton";
import { EntryRouteShell } from "@/components/ui/entry/EntryRouteShell";
import {
  ErrorCallout,
  FieldError,
  InsetGroup,
  SectionLabel,
} from "@/components/ui/entry/entryChrome";
import { filledStyles, grayStyles } from "@/components/ui/entry/entryStyles";
import {
  type JoinSessionFormValues,
  joinSessionFormSchema,
} from "@/domain/session/join/joinSessionForm";
import type { PlayerRole } from "@/domain/session/players/playerRole";
import { playerRoleLabel } from "@/domain/session/players/playerRole";
import { normalizeRolePasscode } from "@/domain/session/players/rolePasscode";
import { ANALYTICS_EVENTS, track } from "@/services/core/analytics/analytics";
import {
  normalizeSessionCode,
  SESSION_CODE_INPUT_PLACEHOLDER,
} from "@/services/session/sessionCodes";
import { parseSessionInviteCode } from "@/services/session/sessionInviteUrl";
import { useJoinSession } from "./join-session/useJoinSession";
import { useHydrated } from "@/hooks/app/useHydrated";

const JOIN_ROLE_OPTIONS: Array<{ value: PlayerRole; label: string }> = [
  { value: "seeker", label: playerRoleLabel("seeker") },
  { value: "hider", label: playerRoleLabel("hider") },
  { value: "observer", label: playerRoleLabel("observer") },
];

function validateJoinForm(values: JoinSessionFormValues) {
  const parsed = joinSessionFormSchema.safeParse(values);
  if (parsed.success) {
    return {};
  }
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && errors[key] == null) {
      errors[key] = issue.message;
    }
  }
  return errors;
}

export function JoinSession() {
  const [searchParams] = useSearchParams();
  // The prerendered /join has no query. Read `?code` only after hydration so the first render
  // matches it; the change-detection below then fills the field (React does not write input
  // values while hydrating).
  const hydrated = useHydrated();
  const codeFromQuery = hydrated ? searchParams.get("code") : null;

  const form = useForm<JoinSessionFormValues>({
    mode: "controlled",
    initialValues: {
      code: parseSessionInviteCode(codeFromQuery) ?? "",
      playerRole: "hider",
      rolePasscode: "",
    },
    validate: validateJoinForm,
  });

  const code = form.values.code;
  const playerRole = form.values.playerRole;
  const rolePasscode = form.values.rolePasscode;
  /**
   * When invite query is absent, suppress preview until the user types
   * (keeps typed code after leaving an invite URL without re-querying).
   */
  const [previewEnabledByTyping, setPreviewEnabledByTyping] = useState(false);
  const inviteFromQuery = parseSessionInviteCode(codeFromQuery);
  const suppressPreview = codeFromQuery == null ? !previewEnabledByTyping : false;

  const [prevCodeFromQuery, setPrevCodeFromQuery] = useState(codeFromQuery);
  if (codeFromQuery !== prevCodeFromQuery) {
    setPrevCodeFromQuery(codeFromQuery);
    setPreviewEnabledByTyping(false);
    if (inviteFromQuery) {
      form.setFieldValue("code", inviteFromQuery);
    } else if (codeFromQuery) {
      form.setFieldValue("code", "");
    }
  }

  const {
    previewPremium,
    lookupLoading,
    needsRolePasscode,
    canRequestAccess,
    error,
    loading,
    joinBusy,
    requestBusy,
    formBusy,
    pendingRequest,
    runJoin,
    onJoinValidationError,
    handleRequestAccess,
    handleCancelRequest,
    waitingLeaderCopy,
  } = useJoinSession({
    code: suppressPreview ? "" : code,
    playerRole,
    rolePasscode,
    onExistingRole: (role) => form.setFieldValue("playerRole", role),
  });

  const handleJoin = form.onSubmit(
    (values) => runJoin(values),
    (fieldErrors) => {
      let message = "Check the join form and try again.";
      if (typeof fieldErrors.code === "string" && fieldErrors.code) {
        message = fieldErrors.code;
      } else if (typeof fieldErrors.rolePasscode === "string" && fieldErrors.rolePasscode) {
        message = fieldErrors.rolePasscode;
      }
      onJoinValidationError(message);
    },
  );

  const { error: codeErrorRaw, ...codeFieldProps } = form.getInputProps("code");
  const { error: rolePasscodeErrorRaw, ...rolePasscodeFieldProps } =
    form.getInputProps("rolePasscode");
  const codeError = typeof codeErrorRaw === "string" ? codeErrorRaw : null;
  const rolePasscodeError = typeof rolePasscodeErrorRaw === "string" ? rolePasscodeErrorRaw : null;

  return (
    <EntryRouteShell title="Join" centerBody>
      <Stack gap={28}>
        <Text
          c="var(--color-field-ink-muted)"
          size="sm"
          style={{ lineHeight: 1.35, textWrap: "pretty", maxWidth: "22rem" }}
        >
          Enter the four-letter code from your host.
        </Text>

        {pendingRequest ? (
          <Stack gap="sm">
            <InsetGroup>
              <Box px="md" py="md">
                <Text fw={590} c="var(--color-field-ink)">
                  {waitingLeaderCopy(pendingRequest.role)}
                </Text>
                <Text size="sm" c="var(--color-field-ink-muted)" mt={6}>
                  Stay on this screen. You&apos;ll join automatically when the leader accepts.
                </Text>
              </Box>
            </InsetGroup>
            <EntryAsyncButton
              type="button"
              styles={grayStyles}
              onClick={() => void handleCancelRequest()}
              busy={requestBusy}
              unavailable={loading}
              idleLabel="Cancel request"
              busyLabel="Cancelling…"
              fullWidth
            />
            {error ? <ErrorCallout>{error}</ErrorCallout> : null}
          </Stack>
        ) : (
          <form onSubmit={handleJoin}>
            <Stack gap={22}>
              <Stack gap={8}>
                <SectionLabel>Session code</SectionLabel>
                <InsetGroup error={Boolean(codeError)}>
                  <TextInput
                    id="join-session-code"
                    aria-label="Session code"
                    aria-invalid={Boolean(codeError)}
                    {...codeFieldProps}
                    onChange={(event) => {
                      setPreviewEnabledByTyping(true);
                      form.setFieldValue("code", normalizeSessionCode(event.currentTarget.value));
                    }}
                    maxLength={4}
                    placeholder={SESSION_CODE_INPUT_PLACEHOLDER}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    error={undefined}
                    styles={{
                      input: {
                        border: "none",
                        background: "transparent",
                        textAlign: "center",
                        fontFamily: "var(--font-mono)",
                        fontSize: "1.75rem",
                        fontWeight: 700,
                        letterSpacing: "0.28em",
                        minHeight: "3.5rem",
                        color: "var(--color-field-ink)",
                        paddingInline: "1rem",
                      },
                    }}
                  />
                </InsetGroup>
                <FieldError>{codeError}</FieldError>
                {previewPremium ? (
                  <Text size="xs" fw={590} c="var(--color-signal)" px={4}>
                    Premium · live transit
                  </Text>
                ) : null}
                {lookupLoading ? (
                  <Text size="sm" c="var(--color-field-ink-muted)" px={4}>
                    Checking session…
                  </Text>
                ) : null}
              </Stack>

              <Stack gap={8}>
                <SectionLabel>Your side</SectionLabel>
                <SegmentedControl
                  fullWidth
                  data={JOIN_ROLE_OPTIONS}
                  value={playerRole}
                  disabled={formBusy}
                  onChange={(value) => {
                    const role = value as PlayerRole;
                    track(ANALYTICS_EVENTS.role_selected, {
                      role,
                      surface: "join",
                    });
                    form.setFieldValue("playerRole", role);
                    form.setFieldValue("rolePasscode", "");
                  }}
                  aria-label="Player side"
                  styles={{
                    root: {
                      backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
                      border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
                      borderRadius: 12,
                      padding: 2,
                    },
                    label: {
                      color: "var(--color-field-ink)",
                      fontWeight: 510,
                      fontSize: "0.9375rem",
                    },
                    indicator: {
                      backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.16)",
                      borderRadius: 10,
                    },
                  }}
                />
              </Stack>

              {needsRolePasscode ? (
                <Stack gap={8}>
                  <SectionLabel>Role code</SectionLabel>
                  <InsetGroup error={Boolean(rolePasscodeError)}>
                    <TextInput
                      id="join-session-role-code"
                      aria-label="Role code"
                      aria-invalid={Boolean(rolePasscodeError)}
                      {...rolePasscodeFieldProps}
                      onChange={(event) =>
                        form.setFieldValue(
                          "rolePasscode",
                          normalizeRolePasscode(event.currentTarget.value),
                        )
                      }
                      maxLength={4}
                      placeholder="Team code"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      error={undefined}
                      styles={{
                        input: {
                          border: "none",
                          background: "transparent",
                          textAlign: "center",
                          fontFamily: "var(--font-mono)",
                          fontSize: "1.25rem",
                          fontWeight: 700,
                          letterSpacing: "0.24em",
                          minHeight: "3.25rem",
                          color: "var(--color-field-ink)",
                          paddingInline: "1rem",
                        },
                      }}
                    />
                  </InsetGroup>
                  <FieldError>{rolePasscodeError}</FieldError>
                  <Text size="xs" c="var(--color-field-ink-muted)" px={4}>
                    {playerRole === "observer"
                      ? "Ask the host for the observer code."
                      : "Leave blank if you're first on that side; otherwise ask a teammate for the role code."}
                  </Text>
                </Stack>
              ) : null}

              <Stack gap="sm">
                <EntryAsyncButton
                  type="submit"
                  fullWidth
                  busy={joinBusy}
                  unavailable={requestBusy}
                  idleLabel="Join session"
                  busyLabel="Joining…"
                  styles={filledStyles}
                />

                {canRequestAccess ? (
                  <EntryAsyncButton
                    type="button"
                    fullWidth
                    styles={grayStyles}
                    onClick={() => void handleRequestAccess()}
                    busy={requestBusy}
                    unavailable={joinBusy}
                    idleLabel="Request access"
                    busyLabel="Requesting…"
                  />
                ) : null}

                <ErrorCallout>{error}</ErrorCallout>
              </Stack>
            </Stack>
          </form>
        )}
      </Stack>
    </EntryRouteShell>
  );
}
