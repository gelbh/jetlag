import { useEffect, useState } from "react";
import { RequireUsername } from "../components/auth/RequireUsername";
import { LeaderboardRankList } from "../components/leaderboard/LeaderboardRankList";
import { EntryScreenLayout } from "../components/ui/EntryScreenLayout";
import { InlineError } from "../components/ui/InlineError";
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
  type LeaderboardEntry,
  type LeaderboardMetric,
  type LeaderboardRole,
  type LeaderboardScope,
} from "../domain/game/leaderboard";
import { GAME_SIZE_OPTIONS, gameSizeLabel } from "../domain/session/gameSize";
import type { GameSize } from "../domain/session/gameSize";
import { playerRoleLabel } from "../domain/session/playerRole";
import { usePermanentAuthUser } from "../hooks/billing/usePermanentAuthUser";
import { useUserProfile } from "../hooks/profile/useUserProfile";
import { isFirebaseConfigured } from "../services/core/firebase";
import { subscribeLeaderboardBoard } from "../services/firestore/firestoreLeaderboard";

function LeaderboardBoard() {
  const { user, isPermanent } = usePermanentAuthUser();
  const [scope, setScope] = useState<LeaderboardScope>("global");
  const [gameSize, setGameSize] = useState<GameSize>("medium");
  const [role, setRole] = useState<LeaderboardRole>("seeker");
  const [metric, setMetric] = useState<LeaderboardMetric>("distance_traveled");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardError, setBoardError] = useState<string | null>(null);
  const { profile, ready: profileReady, error: profileError } = useUserProfile(
    user?.uid,
    isFirebaseConfigured() && isPermanent,
  );
  const needsOptIn = profile != null && !profile.leaderboardOptIn;

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      /* eslint-disable react-hooks/set-state-in-effect -- Firebase off: clear board */
      setEntries([]);
      setBoardLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }

    /* eslint-disable react-hooks/set-state-in-effect -- reset loading for filter change */
    setBoardLoading(true);
    setBoardError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    return subscribeLeaderboardBoard(
      scope,
      gameSize,
      role,
      metric,
      (next) => {
        setEntries(next);
        setBoardLoading(false);
      },
      (error) => {
        setBoardLoading(false);
        setBoardError(error.message);
      },
    );
  }, [scope, gameSize, role, metric]);

  return (
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
        {!profileReady ? (
          <p className="text-sm text-ink-muted">Loading profile…</p>
        ) : profileError ? (
          <InlineError>
            Could not load profile for leaderboard opt-in status.
          </InlineError>
        ) : needsOptIn ? (
          <p className="text-sm leading-relaxed text-ink-muted">
            Leaderboard opt-in is off for your username. You can browse boards;
            turn opt-in on to appear on global ranks.
          </p>
        ) : null}

        <p className="font-display text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-dim">
          {leaderboardScopeLabel(scope)} · {gameSizeLabel(gameSize).label} ·{" "}
          {playerRoleLabel(role)} · {leaderboardMetricLabel(metric, role)}
        </p>

        {boardError ? <InlineError>{boardError}</InlineError> : null}

        {boardError ? null : (
          <LeaderboardRankList
            entries={entries}
            metric={metric}
            viewerUid={user?.uid}
            loading={boardLoading}
            emptyMessage="No ranked entries yet. Finish synced rounds with leaderboard opt-in to populate this board."
          />
        )}
      </div>
    </>
  );
}

export function Leaderboard() {
  return (
    <EntryScreenLayout justify="start">
      <ScreenHeader backTo="/" backLabel="Home" />
      <div className={screenHeaderOffsetClassName}>
        <div className="space-y-1 pb-4">
          <h1 className="font-display text-balance text-[clamp(2rem,10vw,3rem)] font-bold uppercase leading-[0.92] tracking-tight text-ink">
            Leaderboard
          </h1>
          <p className="max-w-sm text-pretty text-base leading-relaxed text-ink-muted">
            Opt-in ranked boards by game size and role. Username only — no
            account details.
          </p>
        </div>

        <RequireUsername
          continuePath="/leaderboard"
          signInDescription="Sign in with a username to opt into leaderboards and view rankings."
        >
          <LeaderboardBoard />
        </RequireUsername>
      </div>
    </EntryScreenLayout>
  );
}
