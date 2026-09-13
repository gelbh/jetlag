import {
  Box,
  Button,
  Container,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { IosEntryHeader } from "@/components/ui/apple/IosEntryHeader";
import {
  IosErrorCallout,
  IosFieldError,
  IosInsetGroup,
  IosSectionLabel,
  iosFilledStyles,
  iosGrayStyles,
} from "@/components/ui/apple/iosEntryChrome";
import { EntryScreenLayout } from "@/components/ui/layout/EntryScreenLayout";
import {
  joinSessionFormSchema,
  type JoinSessionFormValues,
} from "@/domain/session/join/joinSessionForm";
import {
  SESSION_CODE_INPUT_PLACEHOLDER,
  normalizeSessionCode,
} from "@/services/session/sessionCodes";
import { parseSessionInviteCode } from "@/services/session/sessionInviteUrl";
import type { PlayerRole } from "@/domain/session/players/playerRole";
import { playerRoleLabel } from "@/domain/session/players/playerRole";
import { normalizeRolePasscode } from "@/domain/session/players/rolePasscode";
import {
  ANALYTICS_EVENTS,
  track,
} from "@/services/core/analytics/analytics";
import { useJoinSession } from "./join-session/useJoinSession";

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

export function JoinMantine() {
  const [searchParams] = useSearchParams();
  const codeFromQuery = searchParams.get("code");

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
  const suppressPreview =
    codeFromQuery == null ? !previewEnabledByTyping : false;

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
      } else if (
        typeof fieldErrors.rolePasscode === "string" &&
        fieldErrors.rolePasscode
      ) {
        message = fieldErrors.rolePasscode;
      }
      onJoinValidationError(message);
    },
  );

  const {
    error: codeErrorRaw,
    ...codeFieldProps
  } = form.getInputProps("code");
  const {
    error: rolePasscodeErrorRaw,
    ...rolePasscodeFieldProps
  } = form.getInputProps("rolePasscode");
  const codeError =
    typeof codeErrorRaw === "string" ? codeErrorRaw : null;
  const rolePasscodeError =
    typeof rolePasscodeErrorRaw === "string" ? rolePasscodeErrorRaw : null;

  return (
    <EntryScreenLayout justify="start" skin="plain" flush>
      <IosEntryHeader title="Join" />
      <Container
        size="xs"
        w="100%"
        px="md"
        maw={390}
        py="lg"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          minHeight: 0,
        }}
      >
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
              <IosInsetGroup>
                <Box px="md" py="md">
                  <Text fw={590} c="var(--color-field-ink)">
                    {waitingLeaderCopy(pendingRequest.role)}
                  </Text>
                  <Text size="sm" c="var(--color-field-ink-muted)" mt={6}>
                    Stay on this screen. You&apos;ll join automatically when the
                    leader accepts.
                  </Text>
                </Box>
              </IosInsetGroup>
              <Button
                styles={iosGrayStyles}
                onClick={() => void handleCancelRequest()}
                disabled={requestBusy || loading}
                loading={requestBusy}
                fullWidth
              >
                {requestBusy ? "Cancelling…" : "Cancel request"}
              </Button>
              {error ? <IosErrorCallout>{error}</IosErrorCallout> : null}
            </Stack>
          ) : (
            <form onSubmit={handleJoin}>
              <Stack gap={22}>
                <Stack gap={8}>
                  <IosSectionLabel>Session code</IosSectionLabel>
                  <IosInsetGroup error={Boolean(codeError)}>
                    <TextInput
                      id="join-session-code"
                      aria-label="Session code"
                      aria-invalid={Boolean(codeError)}
                      {...codeFieldProps}
                      onChange={(event) => {
                        setPreviewEnabledByTyping(true);
                        form.setFieldValue(
                          "code",
                          normalizeSessionCode(event.currentTarget.value),
                        );
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
                  </IosInsetGroup>
                  <IosFieldError>{codeError}</IosFieldError>
                  {previewPremium ? (
                    <Text
                      size="xs"
                      fw={590}
                      c="var(--color-signal)"
                      px={4}
                    >
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
                  <IosSectionLabel>Your side</IosSectionLabel>
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
                        backgroundColor:
                          "oklch(from var(--color-field-ink) l c h / 0.08)",
                        border:
                          "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
                        borderRadius: 12,
                        padding: 2,
                      },
                      label: {
                        color: "var(--color-field-ink)",
                        fontWeight: 510,
                        fontSize: "0.9375rem",
                      },
                      indicator: {
                        backgroundColor:
                          "oklch(from var(--color-field-ink) l c h / 0.16)",
                        borderRadius: 10,
                      },
                    }}
                  />
                </Stack>

                {needsRolePasscode ? (
                  <Stack gap={8}>
                    <IosSectionLabel>Role code</IosSectionLabel>
                    <IosInsetGroup error={Boolean(rolePasscodeError)}>
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
                    </IosInsetGroup>
                    <IosFieldError>{rolePasscodeError}</IosFieldError>
                    <Text size="xs" c="var(--color-field-ink-muted)" px={4}>
                      {playerRole === "observer"
                        ? "Ask the host for the observer code."
                        : "Leave blank if you're first on that side; otherwise ask a teammate for the role code."}
                    </Text>
                  </Stack>
                ) : null}

                <Stack gap="sm">
                  <Button
                    type="submit"
                    fullWidth
                    disabled={formBusy}
                    loading={joinBusy}
                    styles={iosFilledStyles}
                  >
                    {joinBusy ? "Joining…" : "Join session"}
                  </Button>

                  {canRequestAccess ? (
                    <Button
                      type="button"
                      fullWidth
                      styles={iosGrayStyles}
                      onClick={() => void handleRequestAccess()}
                      disabled={formBusy}
                      loading={requestBusy}
                    >
                      {requestBusy ? "Requesting…" : "Request access"}
                    </Button>
                  ) : null}

                  <IosErrorCallout>{error}</IosErrorCallout>
                </Stack>
              </Stack>
            </form>
          )}
        </Stack>
      </Container>
    </EntryScreenLayout>
  );
}
