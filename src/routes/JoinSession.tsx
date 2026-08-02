import { useEffect, useState } from "react";
import { useAppNavigate } from "../hooks/navigation/useAppNavigate";
import { useSubmitLock } from "../hooks/forms/useSubmitLock";
import { DesktopContentColumn } from "../components/ui/layout/DesktopContentColumn";
import { EntryScreenLayout } from "../components/ui/layout/EntryScreenLayout";
import { InlineError } from "../components/ui/banners/InlineError";
import {
  ScreenHeader,
  screenHeaderOffsetClassName,
} from "../components/ui/layout/ScreenHeader";
import { isPremiumSession } from "../domain/map/annotations";
import {
  isValidSessionCode,
  normalizeSessionCode,
} from "../services/session/sessionCodes";
import { useSessionStore } from "../state/sessionStore";
import type { PlayerRole } from "../domain/session/players/playerRole";
import { joinRequiresRolePasscode } from "../domain/session/players/roleGates";
import { normalizeRolePasscode } from "../domain/session/players/rolePasscode";
import type { SessionRecord } from "../domain/map/annotations";
import { RolePicker } from "../components/session/identity/RolePicker";
import {
  ensureAnonymousUser,
  ensureFreshAnonymousUser,
  isFirebaseConfigured,
} from "../services/core/firebase/firebase";
import {
  joinRemoteSessionByCode,
  lookupRemoteSessionByCode,
  waitForServerHiderRole,
} from "../services/firestore/firestoreAnnotations";
import { APP_VERSION } from "../domain/device/changelog";
import { sessionVersionMismatchMessage } from "../domain/session/meta/sessionVersion";
import { resolvePlayerRole } from "../domain/session/players/playerRole";
import { retryAsync } from "../services/core/network/retryAsync";
import { withTimeout } from "../services/core/withTimeout";
import { MotionPressable } from "../components/motion/MotionPressable";
import {
  ANALYTICS_EVENTS,
  track,
} from "../services/core/analytics/analytics";
import { setPremiumApiContext } from "../services/core/auth/premiumApiContext";
import { preloadCriticalGameAreaCaches } from "../services/session/gameAreaPreload";
import { resolveSessionMatchingAreas } from "../services/geo/matching/resolveSessionMatchingAreas";
import {
  getCachedJoinPreview,
  JOIN_PREVIEW_DEBOUNCE_MS,
  setCachedJoinPreview,
} from "../services/session/joinSessionPreviewCache";

const VERIFY_SESSION_TIMEOUT_MS = 15_000;
const VERIFY_SESSION_TIMEOUT_MESSAGE =
  "Couldn't verify the session. Check your connection and try again.";

type JoinPreviewResult = Awaited<ReturnType<typeof lookupRemoteSessionByCode>>;

export function JoinSession() {
  const navigate = useAppNavigate();
  const session = useSessionStore((state) => state.session);
  const myUid = useSessionStore((state) => state.myUid);
  const setSession = useSessionStore((state) => state.setSession);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { isSubmitting, runLocked } = useSubmitLock();
  const joinBusy = loading || isSubmitting;
  const [previewPremium, setPreviewPremium] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [playerRole, setPlayerRole] = useState<PlayerRole>("hider");
  const [rolePasscode, setRolePasscode] = useState("");
  const [previewSession, setPreviewSession] = useState<SessionRecord | null>(null);
  const needsRolePasscode = joinRequiresRolePasscode(
    previewSession?.memberRoles,
    playerRole,
    myUid ?? undefined,
  );

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      return;
    }

    const normalized = normalizeSessionCode(code);
    if (!isValidSessionCode(normalized)) {
      /* eslint-disable react-hooks/set-state-in-effect -- clear stale preview when code changes */
      setPreviewPremium(false);
      setLookupLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    let cancelled = false;

    const applyPreview = (result: JoinPreviewResult, uid: string) => {
      setPreviewPremium(
        result.status === "found" && isPremiumSession(result.session),
      );
      if (result.status === "found") {
        setPreviewSession(result.session);
        const existingRole = resolvePlayerRole(
          result.session.memberRoles,
          uid,
        );
        if (result.session.memberRoles?.[uid]) {
          setPlayerRole(existingRole);
        }
      } else {
        setPreviewSession(null);
      }
      if (result.status === "missing") {
        setError(null);
      }
    };

    const cached = getCachedJoinPreview<JoinPreviewResult>(normalized);
    if (cached) {
      setLookupLoading(true);
      void (async () => {
        try {
          const user = await ensureAnonymousUser();
          if (cancelled) {
            return;
          }
          applyPreview(cached, user.uid);
        } catch {
          if (!cancelled) {
            setPreviewPremium(false);
          }
        } finally {
          if (!cancelled) {
            setLookupLoading(false);
          }
        }
      })();
      return () => {
        cancelled = true;
      };
    }

    setLookupLoading(true);
    const debounceTimer = window.setTimeout(() => {
      void (async () => {
        try {
          const user = await ensureAnonymousUser();
          const result = await retryAsync(() =>
            lookupRemoteSessionByCode(normalized),
          );
          if (cancelled) {
            return;
          }

          setCachedJoinPreview(normalized, result);
          applyPreview(result, user.uid);
        } catch {
          if (!cancelled) {
            setPreviewPremium(false);
          }
        } finally {
          if (!cancelled) {
            setLookupLoading(false);
          }
        }
      })();
    }, JOIN_PREVIEW_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(debounceTimer);
    };
  }, [code]);

  const handleJoin = () =>
    void runLocked(async () => {
    const normalized = normalizeSessionCode(code);
    if (!isValidSessionCode(normalized)) {
      setError("Enter a 4-letter session code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!isFirebaseConfigured()) {
        setError("Firebase is not configured. Create a local session instead.");
        return;
      }

      await withTimeout(
        (async () => {
          const user = await retryAsync(() => ensureFreshAnonymousUser());
          const joinOptions =
            session?.code === normalized && myUid
              ? {
                  returningMemberUid: myUid,
                  persistedMyUid: myUid,
                  rolePasscode: rolePasscode || undefined,
                }
              : { rolePasscode: rolePasscode || undefined };
          const result = await retryAsync(() =>
            joinRemoteSessionByCode(
              normalized,
              user.uid,
              playerRole,
              APP_VERSION,
              joinOptions,
            ),
          );
          if (result.status === "missing") {
            setError("No session found for that code.");
            return;
          }

          if (result.status === "ended") {
            setError("That session has ended. Ask the host for a new code.");
            return;
          }

          if (result.status === "incompatible") {
            setError(
              sessionVersionMismatchMessage(result.hostVersion, APP_VERSION),
            );
            return;
          }

          let joinedSession = result.session;
          if (playerRole === "hider") {
            const confirmed = await waitForServerHiderRole(
              joinedSession.id,
              user.uid,
            );
            if (!confirmed || confirmed.memberRoles?.[user.uid] !== "hider") {
              setError(
                "Couldn't confirm your hider role. Wait a moment and try again.",
              );
              return;
            }
            joinedSession = confirmed;
          }

          setSession(joinedSession, user.uid);
          setPremiumApiContext(result.session);
          track(ANALYTICS_EVENTS.session_joined, { role: playerRole });
          if (joinedSession.gameArea) {
            void (async () => {
              const matchingAreas =
                await resolveSessionMatchingAreas(joinedSession);
              void preloadCriticalGameAreaCaches(
                joinedSession.gameArea!,
                matchingAreas,
                joinedSession.regionPackId,
              );
            })();
          }
          navigate("/map");
        })(),
        VERIFY_SESSION_TIMEOUT_MS,
        VERIFY_SESSION_TIMEOUT_MESSAGE,
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Couldn't join that session.",
      );
    } finally {
      setLoading(false);
    }
  });

  return (
    <EntryScreenLayout justify="center">
      <ScreenHeader backTo="/" backLabel="Back" />
      <DesktopContentColumn maxWidth="entry" className="flex flex-col gap-8">
        <div className={screenHeaderOffsetClassName}>
          <p className="mt-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-brand-blue">
            Join game
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold uppercase leading-none tracking-tight text-ink">
            Session code
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
            Enter the four letters your host shared. Everyone in the session sees
            the same live map.
          </p>
        </div>

        <div className="desktop-entry-actions jl-field-frame space-y-4">
          <label className="field-label font-display text-xs uppercase tracking-[0.12em]">
            Code
            <input
              value={code}
              onChange={(event) =>
                setCode(normalizeSessionCode(event.target.value))
              }
              maxLength={4}
              className="field-input mt-2 min-h-16 border-0 bg-transparent p-0 text-center font-mono text-4xl font-bold tracking-[0.45em] focus:outline-none"
              placeholder="ABCD"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
          </label>

          {previewPremium ? (
            <p className="font-display text-xs font-semibold uppercase tracking-wide text-status-info">
              Premium · live transit
            </p>
          ) : null}
          {lookupLoading ? (
            <p className="text-sm text-ink-dim">Checking session…</p>
          ) : null}

          <RolePicker
            value={playerRole}
            onChange={(role) => {
              track(ANALYTICS_EVENTS.role_selected, {
                role,
                surface: "join",
              });
              setPlayerRole(role);
              setRolePasscode("");
            }}
            disabled={joinBusy}
            includeObserver
          />

          {needsRolePasscode ? (
            <label className="field-label font-display text-xs uppercase tracking-[0.12em]">
              Role code
              <input
                value={rolePasscode}
                onChange={(event) =>
                  setRolePasscode(normalizeRolePasscode(event.target.value))
                }
                maxLength={4}
                className="field-input mt-2 min-h-12 w-full text-center font-mono text-2xl font-bold tracking-[0.35em]"
                placeholder="Team code"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
              <span className="mt-2 block text-xs normal-case tracking-normal text-ink-muted">
                {playerRole === "observer"
                  ? "Ask the host for the observer code."
                  : "Ask a teammate on that side for the role code."}
              </span>
            </label>
          ) : null}

          <MotionPressable
            type="button"
            onClick={() => void handleJoin()}
            disabled={joinBusy}
            className="btn-primary home-entry-action min-h-14 w-full disabled:opacity-50"
          >
            {joinBusy ? "Joining…" : "Join session"}
          </MotionPressable>

          {error ? <InlineError>{error}</InlineError> : null}
        </div>
      </DesktopContentColumn>
    </EntryScreenLayout>
  );
}
