import { useEffect, useRef, useState } from "react";
import { RequireUsername } from "../components/auth/RequireUsername";
import { LeaderboardBoardChip } from "../components/leaderboard/LeaderboardBoardChip";
import { LeaderboardBoardSheet } from "../components/leaderboard/LeaderboardBoardSheet";
import { LeaderboardLeadPack } from "../components/leaderboard/LeaderboardLeadPack";
import { LeaderboardRankList } from "../components/leaderboard/LeaderboardRankList";
import { LeaderboardSelfFooter } from "../components/leaderboard/LeaderboardSelfFooter";
import { DesktopContentColumn } from "../components/ui/DesktopContentColumn";
import { EntryScreenLayout } from "../components/ui/EntryScreenLayout";
import { InlineError } from "../components/ui/InlineError";
import { SegmentControl } from "../components/ui/SegmentControl";
import {
  ScreenHeader,
  screenHeaderInsetTopClassName,
  screenHeaderOffsetClassName,
} from "../components/ui/ScreenHeader";
import {
  LEADERBOARD_SCOPES,
  leaderboardScopeLabel,
  type LeaderboardEntry,
} from "../domain/game/leaderboard";
import {
  loadLeaderboardBoardPrefs,
  saveLeaderboardBoardPrefs,
  type LeaderboardBoardSelection,
} from "../domain/game/leaderboardBoardPrefs";
import {
  leaderboardBoardSummaryLabel,
  resolveSelfFooterMode,
  splitLeadPack,
} from "../domain/game/leaderboardView";
import { usePermanentAuthUser } from "../hooks/billing/usePermanentAuthUser";
import { useLeaderboardSelfEntry } from "../hooks/leaderboard/useLeaderboardSelfEntry";
import { useRowInView } from "../hooks/leaderboard/useRowInView";
import { useUserProfile } from "../hooks/profile/useUserProfile";
import { isFirebaseConfigured } from "../services/core/firebase";
import { subscribeLeaderboardBoard } from "../services/firestore/firestoreLeaderboard";

const EMPTY_BOARD_MESSAGE =
  "No ranked entries yet. Finish synced rounds with leaderboard opt-in to populate this board.";

function LeaderboardBoard() {
  const { user, isPermanent } = usePermanentAuthUser();
  const [selection, setSelection] = useState(loadLeaderboardBoardPrefs);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardError, setBoardError] = useState<string | null>(null);
  const viewerRowRef = useRef<HTMLLIElement | null>(null);
  const { profile, ready: profileReady, error: profileError } = useUserProfile(
    user?.uid,
    isFirebaseConfigured() && isPermanent,
  );
  const listEntry =
    user?.uid != null
      ? (entries.find((entry) => entry.uid === user.uid) ?? null)
      : null;
  const {
    entry: selfEntry,
    error: selfError,
    loading: selfLoading,
  } = useLeaderboardSelfEntry(
    selection,
    user?.uid,
    !boardLoading && listEntry != null,
  );
  const rowInView = useRowInView(viewerRowRef, listEntry?.uid ?? null);
  const needsOptIn = profile != null && !profile.leaderboardOptIn;

  useEffect(() => {
    saveLeaderboardBoardPrefs(selection);
  }, [selection]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync board loading when filters change or Firebase is off */
    if (!isFirebaseConfigured()) {
      setEntries([]);
      setBoardLoading(false);
      return;
    }

    setBoardLoading(true);
    setBoardError(null);
    setEntries([]);
    /* eslint-enable react-hooks/set-state-in-effect */
    return subscribeLeaderboardBoard(
      selection.scope,
      selection.gameSize,
      selection.role,
      selection.metric,
      (next) => {
        setEntries(next);
        setBoardLoading(false);
      },
      (error) => {
        setBoardLoading(false);
        setBoardError(error.message);
      },
    );
  }, [selection.scope, selection.gameSize, selection.role, selection.metric]);
  const footerMode = resolveSelfFooterMode({
    viewerUid: user?.uid,
    listEntry,
    selfEntry,
    selfError,
    selfLoading,
    rowInView,
  });
  const footerEntry = listEntry ?? selfEntry;
  const footerVisible = footerMode !== "hidden";
  const { lead, rest } = splitLeadPack(entries);

  function updateSelection(next: LeaderboardBoardSelection) {
    setSelection(next);
  }

  return (
    <>
      <div
        className={`sticky top-0 z-[var(--z-banner)] -mx-5 flex items-center gap-2 border-b-2 border-border bg-surface-deep px-5 pb-3 ${screenHeaderInsetTopClassName}`}
        data-testid="leaderboard-filters"
      >
        <div className="shrink-0">
          <SegmentControl
            value={selection.scope}
            options={LEADERBOARD_SCOPES.map((value) => ({
              value,
              label: leaderboardScopeLabel(value),
            }))}
            onChange={(scope) => updateSelection({ ...selection, scope })}
            aria-label="Leaderboard scope"
          />
        </div>
        <LeaderboardBoardChip
          label={leaderboardBoardSummaryLabel(selection)}
          onClick={() => setSheetOpen(true)}
          expanded={sheetOpen}
        />
      </div>

      <LeaderboardBoardSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        selection={selection}
        onChange={updateSelection}
      />

      <div className={`space-y-3 pt-4 ${footerVisible ? "pb-16" : ""}`}>
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

        {boardError ? <InlineError>{boardError}</InlineError> : null}

        {boardError ? null : (
          <>
            <LeaderboardLeadPack
              entries={lead}
              metric={selection.metric}
              viewerUid={user?.uid}
              loading={boardLoading}
              viewerRowRef={viewerRowRef}
            />

            {!boardLoading && (rest.length > 0 || lead.length === 0) ? (
              <LeaderboardRankList
                entries={rest}
                metric={selection.metric}
                viewerUid={user?.uid}
                emptyMessage={EMPTY_BOARD_MESSAGE}
                viewerRowRef={viewerRowRef}
              />
            ) : null}
          </>
        )}
      </div>

      <LeaderboardSelfFooter
        mode={footerMode}
        entry={footerEntry}
        metric={selection.metric}
        onJump={() => {
          viewerRowRef.current?.scrollIntoView({
            block: "center",
            behavior: "smooth",
          });
        }}
      />
    </>
  );
}

export function Leaderboard() {
  return (
    <EntryScreenLayout justify="start">
      <ScreenHeader backTo="/" backLabel="Home" />
      <DesktopContentColumn maxWidth="social">
        <div className={screenHeaderOffsetClassName}>
          <div className="space-y-1 pb-4">
            <h1 className="font-display text-balance text-3xl font-bold uppercase leading-[0.92] tracking-tight text-ink sm:text-[2rem]">
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
      </DesktopContentColumn>
    </EntryScreenLayout>
  );
}
