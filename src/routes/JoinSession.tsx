import { Box, Button, SegmentedControl, Stack, Text, TextInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useEffect, useState } from "react";
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
import type { JoinCastleSiegeSeat } from "@/domain/session/join/joinSessionForm";
import {
  type JoinSessionFormValues,
  joinSessionFormSchema,
} from "@/domain/session/join/joinSessionForm";
import type { PlayerRole } from "@/domain/session/players/playerRole";
import { playerRoleLabel } from "@/domain/session/players/playerRole";
import { normalizeRolePasscode } from "@/domain/session/players/rolePasscode";
import { useHydrated } from "@/hooks/app/useHydrated";
import { ANALYTICS_EVENTS, track } from "@/services/core/analytics/analytics";
import {
  isValidSessionCode,
  normalizeSessionCode,
  SESSION_CODE_INPUT_PLACEHOLDER,
} from "@/services/session/sessionCodes";
import { parseSessionInviteCode } from "@/services/session/sessionInviteUrl";
import { CastleSiegeSeatPicker } from "./join-session/CastleSiegeSeatPicker";
import { useJoinSession } from "./join-session/useJoinSession";

const JOIN_ROLE_OPTIONS: Array<{ value: PlayerRole; label: string }> = [
  { value: "seeker", label: playerRoleLabel("seeker") },
  { value: "hider", label: playerRoleLabel("hider") },
  { value: "observer", label: playerRoleLabel("observer") },
];

type JoinStep = "code" | "preview" | "seat" | "passcode";

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
  const hydrated = useHydrated();
  const codeFromQuery = hydrated ? searchParams.get("code") : null;

  const form = useForm<JoinSessionFormValues>({
    mode: "controlled",
    initialValues: {
      code: parseSessionInviteCode(codeFromQuery) ?? "",
      playerRole: "hider",
      castleSiegeRole: "teamA",
      rolePasscode: "",
    },
    validate: validateJoinForm,
  });

  const code = form.values.code;
  const playerRole = form.values.playerRole;
  const castleSiegeRole = form.values.castleSiegeRole ?? "teamA";
  const rolePasscode = form.values.rolePasscode;
  const [previewEnabledByTyping, setPreviewEnabledByTyping] = useState(false);
  const inviteFromQuery = parseSessionInviteCode(codeFromQuery);
  const suppressPreview = codeFromQuery == null ? !previewEnabledByTyping : false;
  const [joinStep, setJoinStep] = useState<JoinStep>("code");

  const [prevCodeFromQuery, setPrevCodeFromQuery] = useState(codeFromQuery);
  if (codeFromQuery !== prevCodeFromQuery) {
    setPrevCodeFromQuery(codeFromQuery);
    setPreviewEnabledByTyping(false);
    setJoinStep("code");
    if (inviteFromQuery) {
      form.setFieldValue("code", inviteFromQuery);
    } else if (codeFromQuery) {
      form.setFieldValue("code", "");
    }
  }

  const {
    previewSession,
    previewPremium,
    lookupLoading,
    castleSiegeJoin,
    needsRolePasscode,
    rolePasscodeOccupancyKnown,
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
    castleSiegeRole,
    rolePasscode,
    onExistingRole: (role) => form.setFieldValue("playerRole", role),
    onExistingCastleSiegeRole: (seat) => form.setFieldValue("castleSiegeRole", seat),
  });

  useEffect(() => {
    if (!inviteFromQuery || joinStep !== "code") {
      return;
    }
    if (previewSession && !lookupLoading) {
      setJoinStep("preview");
    }
  }, [inviteFromQuery, joinStep, lookupLoading, previewSession]);

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

  const codeStepReady = isValidSessionCode(code) && !lookupLoading && Boolean(previewSession);
  const passcodeHint = castleSiegeJoin
    ? castleSiegeRole === "observer" || castleSiegeRole === "referee"
      ? "Ask the host for the seat code."
      : rolePasscodeOccupancyKnown
        ? "Ask a teammate on that team for the seat code."
        : "If anyone is already on that team, ask them for the seat code. Leave it blank only if you know you're first."
    : playerRole === "observer"
      ? "Ask the host for the observer code."
      : rolePasscodeOccupancyKnown
        ? "Ask a teammate on that side for the role code."
        : "If anyone is already on that side, ask them for the role code. Leave it blank only if you know you're first.";

  const goBack = () => {
    setJoinStep((step) => {
      if (step === "passcode") {
        return "seat";
      }
      if (step === "seat") {
        return "preview";
      }
      if (step === "preview") {
        return "code";
      }
      return step;
    });
  };

  const advanceFromSeat = () => {
    if (needsRolePasscode) {
      setJoinStep("passcode");
      return;
    }
    handleJoin();
  };

  return (
    <EntryRouteShell title="Join" centerBody>
      <Stack gap={28}>
        {joinStep === "code" ? (
          <Text
            c="var(--color-field-ink-muted)"
            size="sm"
            style={{ lineHeight: 1.35, textWrap: "pretty", maxWidth: "22rem" }}
          >
            Enter the four-letter code from your host.
          </Text>
        ) : null}

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
              {joinStep === "code" ? (
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
                        setJoinStep("code");
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
                  {lookupLoading ? (
                    <Text size="sm" c="var(--color-field-ink-muted)" px={4}>
                      Checking session…
                    </Text>
                  ) : null}
                  {!lookupLoading && isValidSessionCode(code) && !previewSession ? (
                    <Text size="sm" c="var(--color-field-ink-muted)" px={4}>
                      No session found for that code.
                    </Text>
                  ) : null}
                  <EntryAsyncButton
                    type="button"
                    fullWidth
                    busy={false}
                    unavailable={!codeStepReady}
                    idleLabel="Continue"
                    busyLabel="Continue"
                    styles={filledStyles}
                    onClick={() => setJoinStep("preview")}
                  />
                </Stack>
              ) : null}

              {joinStep === "preview" ? (
                <Stack gap="sm">
                  <InsetGroup>
                    <Box px="md" py="md">
                      <Text fw={590} c="var(--color-field-ink)">
                        {castleSiegeJoin ? "Castle Siege" : "Classic Jet Lag"}
                      </Text>
                      {castleSiegeJoin && previewSession?.seriesLength ? (
                        <Text size="sm" c="var(--color-field-ink-muted)" mt={6}>
                          Best of {previewSession.seriesLength}
                        </Text>
                      ) : null}
                      {previewPremium ? (
                        <Text size="sm" c="var(--color-signal)" mt={6}>
                          Premium · live transit
                        </Text>
                      ) : null}
                    </Box>
                  </InsetGroup>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="subtle"
                      color="gray"
                      className="min-h-11"
                      onClick={goBack}
                    >
                      Back
                    </Button>
                    <EntryAsyncButton
                      type="button"
                      fullWidth
                      busy={false}
                      unavailable={lookupLoading}
                      idleLabel="Continue"
                      busyLabel="Continue"
                      styles={filledStyles}
                      onClick={() => setJoinStep("seat")}
                    />
                  </div>
                </Stack>
              ) : null}

              {joinStep === "seat" ? (
                <Stack gap={8}>
                  <SectionLabel>{castleSiegeJoin ? "Your seat" : "Your side"}</SectionLabel>
                  {castleSiegeJoin ? (
                    <CastleSiegeSeatPicker
                      value={castleSiegeRole as JoinCastleSiegeSeat}
                      disabled={formBusy}
                      onChange={(seat) => {
                        track(ANALYTICS_EVENTS.role_selected, {
                          role: seat,
                          surface: "join",
                        });
                        form.setFieldValue("castleSiegeRole", seat);
                        form.setFieldValue("rolePasscode", "");
                      }}
                    />
                  ) : (
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
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="subtle"
                      color="gray"
                      className="min-h-11"
                      onClick={goBack}
                    >
                      Back
                    </Button>
                    <EntryAsyncButton
                      type="button"
                      fullWidth
                      busy={joinBusy || requestBusy}
                      unavailable={joinBusy || requestBusy || lookupLoading}
                      idleLabel={needsRolePasscode ? "Continue" : "Join session"}
                      busyLabel={needsRolePasscode ? "Continue" : "Joining…"}
                      styles={filledStyles}
                      onClick={advanceFromSeat}
                    />
                  </div>
                </Stack>
              ) : null}

              {joinStep === "passcode" ? (
                <>
                  <Stack gap={8}>
                    <SectionLabel>{castleSiegeJoin ? "Seat code" : "Role code"}</SectionLabel>
                    <InsetGroup error={Boolean(rolePasscodeError)}>
                      <TextInput
                        id="join-session-role-code"
                        aria-label={castleSiegeJoin ? "Seat code" : "Role code"}
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
                      {passcodeHint}
                    </Text>
                  </Stack>

                  <Stack gap="sm">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="subtle"
                        color="gray"
                        className="min-h-11"
                        onClick={goBack}
                      >
                        Back
                      </Button>
                      <EntryAsyncButton
                        type="submit"
                        fullWidth
                        busy={joinBusy}
                        unavailable={requestBusy || lookupLoading}
                        idleLabel="Join session"
                        busyLabel="Joining…"
                        styles={filledStyles}
                      />
                    </div>

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
                </>
              ) : null}

              {joinStep !== "passcode" && error ? <ErrorCallout>{error}</ErrorCallout> : null}
            </Stack>
          </form>
        )}
      </Stack>
    </EntryRouteShell>
  );
}
