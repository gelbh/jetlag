import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useSearchParams } from "react-router-dom";
import { DesktopContentColumn } from "../components/ui/layout/DesktopContentColumn";
import { EntryScreenLayout } from "../components/ui/layout/EntryScreenLayout";
import { InlineError } from "../components/ui/banners/InlineError";
import { TextField } from "../components/ui/forms/TextField";
import {
  ScreenHeader,
  screenHeaderOffsetClassName,
} from "../components/ui/layout/ScreenHeader";
import {
  joinSessionFormSchema,
  type JoinSessionFormValues,
} from "../domain/session/join/joinSessionForm";
import {
  SESSION_CODE_INPUT_PLACEHOLDER,
  normalizeSessionCode,
} from "../services/session/sessionCodes";
import { parseSessionInviteCode } from "../services/session/sessionInviteUrl";
import { RolePicker } from "../components/session/identity/RolePicker";
import { normalizeRolePasscode } from "../domain/session/players/rolePasscode";
import { MotionPressable } from "../components/motion/MotionPressable";
import { buttonVariants } from "../components/ui/button";
import { cn } from "../lib/cn";
import {
  ANALYTICS_EVENTS,
  track,
} from "../services/core/analytics/analytics";
import { useJoinSession } from "./join-session/useJoinSession";

export function JoinLegacy() {
  const [searchParams] = useSearchParams();
  const codeFromQuery = searchParams.get("code");
  const { control, watch, setValue, handleSubmit } =
    useForm<JoinSessionFormValues>({
      resolver: zodResolver(joinSessionFormSchema),
      defaultValues: {
        code: parseSessionInviteCode(codeFromQuery) ?? "",
        playerRole: "hider",
        rolePasscode: "",
      },
      mode: "onSubmit",
    });
  const code = watch("code");
  const playerRole = watch("playerRole");
  const rolePasscode = watch("rolePasscode");
  /** When invite query is removed, keep typed code but suppress cached preview. */
  const [suppressPreview, setSuppressPreview] = useState(false);

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
    onExistingRole: (role) => setValue("playerRole", role),
  });

  useEffect(() => {
    const next = parseSessionInviteCode(codeFromQuery);
    if (!next) {
      if (codeFromQuery) {
        setSuppressPreview(false);
        setValue("code", "");
      } else {
        setSuppressPreview(true);
      }
      return;
    }
    setSuppressPreview(false);
    setValue("code", next);
  }, [codeFromQuery, setValue]);

  const handleJoin = () =>
    void handleSubmit(
      (values) => runJoin(values),
      (fieldErrors) => {
        onJoinValidationError(
          fieldErrors.code?.message ??
            fieldErrors.rolePasscode?.message ??
            "Check the join form and try again.",
        );
      },
    )();

  return (
    <EntryScreenLayout justify="center">
      <ScreenHeader backTo="/" backLabel="Back" />
      <DesktopContentColumn maxWidth="entry" className="flex flex-col gap-8">
        <div className={screenHeaderOffsetClassName}>
          <p className="mt-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-signal">
            Join game
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold uppercase leading-none tracking-tight text-field-ink">
            Session code
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-field-ink-muted">
            Enter the four letters your host shared. Everyone in the session sees
            the same live map.
          </p>
        </div>

        <div className="desktop-entry-actions jl-field-frame space-y-4">
          {pendingRequest ? (
            <>
              <p className="font-display text-sm font-semibold uppercase tracking-[0.12em] text-field-ink">
                {waitingLeaderCopy(pendingRequest.role)}
              </p>
              <p className="text-sm leading-relaxed text-field-ink-muted">
                Stay on this screen. You&apos;ll join automatically when the
                leader accepts.
              </p>
              <MotionPressable
                type="button"
                onClick={() => void handleCancelRequest()}
                disabled={requestBusy || loading}
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "home-entry-action min-h-14 w-full",
                )}
              >
                {requestBusy ? "Cancelling…" : "Cancel request"}
              </MotionPressable>
              {error ? <InlineError>{error}</InlineError> : null}
            </>
          ) : (
            <>
              <Controller
                name="code"
                control={control}
                render={({ field }) => (
                  <TextField
                    id="join-session-code"
                    label="Code"
                    labelClassName="field-label font-display text-xs uppercase tracking-[0.12em]"
                    inputClassName="field-input mt-2 min-h-16 border-0 bg-transparent p-0 text-center font-mono text-4xl font-bold tracking-[0.45em] focus:outline-none"
                    value={field.value}
                    onChange={(event) => {
                      setSuppressPreview(false);
                      field.onChange(
                        normalizeSessionCode(event.target.value),
                      );
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    maxLength={4}
                    placeholder={SESSION_CODE_INPUT_PLACEHOLDER}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                )}
              />

              {previewPremium ? (
                <p className="font-display text-xs font-semibold uppercase tracking-wide text-signal">
                  Premium · live transit
                </p>
              ) : null}
              {lookupLoading ? (
                <p className="text-sm text-field-ink-muted">Checking session…</p>
              ) : null}

              <Controller
                name="playerRole"
                control={control}
                render={({ field }) => (
                  <RolePicker
                    value={field.value}
                    onChange={(role) => {
                      track(ANALYTICS_EVENTS.role_selected, {
                        role,
                        surface: "join",
                      });
                      field.onChange(role);
                      setValue("rolePasscode", "");
                    }}
                    disabled={formBusy}
                    includeObserver
                  />
                )}
              />

              {needsRolePasscode ? (
                <div>
                  <Controller
                    name="rolePasscode"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        id="join-session-role-code"
                        label="Role code"
                        labelClassName="field-label font-display text-xs uppercase tracking-[0.12em]"
                        inputClassName="field-input mt-2 min-h-12 w-full text-center font-mono text-2xl font-bold tracking-[0.35em]"
                        value={field.value}
                        onChange={(event) =>
                          field.onChange(
                            normalizeRolePasscode(event.target.value),
                          )
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                        maxLength={4}
                        placeholder="Team code"
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                    )}
                  />
                  <span className="mt-2 block text-xs normal-case tracking-normal text-field-ink-muted">
                    {playerRole === "observer"
                      ? "Ask the host for the observer code."
                      : "Leave blank if you're first on that side; otherwise ask a teammate for the role code."}
                  </span>
                </div>
              ) : null}

              <MotionPressable
                type="button"
                onClick={() => void handleJoin()}
                disabled={formBusy}
                className={cn(
                  buttonVariants({ variant: "flag" }),
                  "home-entry-action min-h-14 w-full",
                )}
              >
                {joinBusy ? "Joining…" : "Join session"}
              </MotionPressable>

              {canRequestAccess ? (
                <MotionPressable
                  type="button"
                  onClick={() => void handleRequestAccess()}
                  disabled={formBusy}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "home-entry-action min-h-14 w-full",
                  )}
                >
                  {requestBusy ? "Requesting…" : "Request access"}
                </MotionPressable>
              ) : null}

              {error ? <InlineError>{error}</InlineError> : null}
            </>
          )}
        </div>
      </DesktopContentColumn>
    </EntryScreenLayout>
  );
}
