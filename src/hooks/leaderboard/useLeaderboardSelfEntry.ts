import { useEffect, useState } from "react";
import type { LeaderboardEntry } from "../../domain/game/leaderboard";
import type { LeaderboardBoardSelection } from "../../domain/game/leaderboardBoardPrefs";
import { getLeaderboardSelfEntry } from "../../services/firestore/firestoreLeaderboard";

/** When `skip` is true (e.g. viewer already in the board list), no self fetch runs. */
export function useLeaderboardSelfEntry(
  selection: LeaderboardBoardSelection,
  uid: string | null | undefined,
  skip = false,
) {
  const [entry, setEntry] = useState<LeaderboardEntry | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uid || skip) {
      /* eslint-disable react-hooks/set-state-in-effect -- clear self-entry when board/uid/skip changes */
      setEntry(null);
      setError(false);
      setLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    setEntry(null);
    getLeaderboardSelfEntry(
      selection.scope,
      selection.gameSize,
      selection.role,
      selection.metric,
      uid,
    )
      .then((next) => {
        if (cancelled) return;
        setEntry(next);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setEntry(null);
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    selection.scope,
    selection.gameSize,
    selection.role,
    selection.metric,
    uid,
    skip,
  ]);

  return { entry, error, loading };
}
