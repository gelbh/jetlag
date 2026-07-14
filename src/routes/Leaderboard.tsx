import { useEffect, useState } from "react";
import { AccountSignInGate } from "../components/auth/AccountSignInGate";
import { BootSplash } from "../components/ui/BootSplash";
import { EntryScreenLayout } from "../components/ui/EntryScreenLayout";
import { SegmentControl } from "../components/ui/SegmentControl";
import {
  ScreenHeader,
  screenHeaderInsetTopClassName,
  screenHeaderOffsetClassName,
} from "../components/ui/ScreenHeader";
import {
  LEADERBOARD_METRICS,
  LEADERBOARD_ROLES,
  LEADERBOARD_SCOPES,
  leaderboardMetricLabel,
  leaderboardScopeLabel,
  type LeaderboardMetric,
  type LeaderboardRole,
  type LeaderboardScope,
} from "../domain/game/leaderboard";
import { GAME_SIZE_OPTIONS, gameSizeLabel } from "../domain/session/gameSize";
import type { GameSize } from "../domain/session/gameSize";
import { playerRoleLabel } from "../domain/session/playerRole";
import { usePermanentAuthUser } from "../hooks/billing/usePermanentAuthUser";
import { isFirebaseConfigured } from "../services/core/firebase";
import {
  subscribeUserProfile,
  type UserProfile,
} from "../services/firestore/firestoreProfile";

export function Leaderboard() {
  const { user, isPermanent, authReady } = usePermanentAuthUser();
  const [scope, setScope] = useState<LeaderboardScope>("global");
  const [gameSize, setGameSize] = useState<GameSize>("medium");
  const [role, setRole] = useState<LeaderboardRole>("seeker");
  const [metric, setMetric] = useState<LeaderboardMetric>("distance_traveled");
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const profileEnabled =
    isFirebaseConfigured() && isPermanent && user != null;

  useEffect(() => {
    if (!profileEnabled || !user) {
      return;
    }

    return subscribeUserProfile(
      user.uid,
      setProfile,
      () => setProfile(null),
    );
  }, [profileEnabled, user]);

  const activeProfile = profileEnabled ? profile : null;

  const showSignIn =
    isFirebaseConfigured() && authReady && !isPermanent;
  const needsOptIn =
    isPermanent && activeProfile != null && !activeProfile.leaderboardOptIn;

  if (isFirebaseConfigured() && !authReady) {
    return (
      <EntryScreenLayout justify="start">
        <ScreenHeader backTo="/" backLabel="Home" />
        <BootSplash label="Starting…" />
      </EntryScreenLayout>
    );
  }

  return (
    <EntryScreenLayout justify="start">
      <ScreenHeader backTo="/" backLabel="Home" />
      <div className={screenHeaderOffsetClassName}>
        <div className="space-y-1 pb-4">
          <h1 className="font-display text-balance text-[clamp(2rem,10vw,3rem)] font-bold uppercase leading-[0.92] tracking-tight text-ink">
            Leaderboard
          </h1>
          <p className="max-w-sm text-pretty text-base leading-relaxed text-ink-muted">
            Opt-in ranked boards by game size and role. Display name only —
            no account details.
          </p>
        </div>

        {showSignIn ? (
          <AccountSignInGate
            continuePath="/leaderboard"
            description="Sign in with a display name to opt into leaderboards and view rankings."
          />
        ) : (
          <>
            <div
              className={`sticky top-0 z-[var(--z-banner)] -mx-5 space-y-3 border-b-2 border-border bg-surface-deep px-5 pb-3 ${screenHeaderInsetTopClassName}`}
            >
              <SegmentControl
                value={scope}
                options={LEADERBOARD_SCOPES.map((value) => ({
                  value,
                  label: leaderboardScopeLabel(value),
                }))}
                onChange={setScope}
                aria-label="Leaderboard scope"
              />
              <SegmentControl
                value={gameSize}
                options={GAME_SIZE_OPTIONS.map((value) => ({
                  value,
                  label: gameSizeLabel(value).label,
                }))}
                onChange={setGameSize}
                aria-label="Game size"
              />
              <SegmentControl
                value={role}
                options={LEADERBOARD_ROLES.map((value) => ({
                  value,
                  label: playerRoleLabel(value),
                }))}
                onChange={setRole}
                aria-label="Player role"
              />
              <SegmentControl
                value={metric}
                options={LEADERBOARD_METRICS.map((value) => ({
                  value,
                  label: leaderboardMetricLabel(value, role),
                }))}
                onChange={setMetric}
                aria-label="Leaderboard metric"
              />
            </div>

            <div className="space-y-3 pt-4">
              {needsOptIn ? (
                <p className="text-sm leading-relaxed text-ink-muted">
                  Leaderboard opt-in is off for your profile. Turn it on after
                  you set a display name to appear on global boards.
                </p>
              ) : null}

              <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
                {leaderboardScopeLabel(scope)} · {gameSizeLabel(gameSize).label}{" "}
                · {playerRoleLabel(role)} · {leaderboardMetricLabel(metric, role)}
              </p>

              <p className="text-sm leading-relaxed text-ink-muted">
                No ranked entries yet. Finish synced rounds with leaderboard
                opt-in to populate this board.
              </p>
            </div>
          </>
        )}
      </div>
    </EntryScreenLayout>
  );
}
