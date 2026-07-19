import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from "firebase/firestore";
import type {
  LeaderboardEntry,
  LeaderboardMetric,
  LeaderboardRole,
  LeaderboardScope,
} from "../../domain/game/leaderboard";
import { leaderboardBoardKey } from "../../domain/game/leaderboard";
import type { GameSize } from "../../domain/session/gameSize";
import { getFirestoreDb, isFirebaseConfigured } from "../core/firebase";

const BOARD_LIMIT = 50;

export function parseLeaderboardEntry(
  id: string,
  data: Record<string, unknown>,
  index: number,
): LeaderboardEntry | null {
  const uid = typeof data.uid === "string" ? data.uid : id;
  const displayName =
    typeof data.username === "string" && data.username.trim()
      ? data.username.trim()
      : typeof data.displayName === "string"
        ? data.displayName.trim()
        : "";
  const value = typeof data.value === "number" ? data.value : NaN;
  if (!uid || !Number.isFinite(value)) {
    return null;
  }
  const rank =
    typeof data.rank === "number" && Number.isFinite(data.rank)
      ? data.rank
      : index + 1;
  return { uid, displayName: displayName || "Player", value, rank };
}

function boardEntriesCollection(
  scope: LeaderboardScope,
  gameSize: GameSize,
  role: LeaderboardRole,
  metric: LeaderboardMetric,
) {
  const boardId = leaderboardBoardKey(scope, gameSize, role, metric).replaceAll(
    "/",
    "_",
  );
  return collection(
    getFirestoreDb(),
    "leaderboard",
    scope,
    "boards",
    boardId,
    "entries",
  );
}

/**
 * One-shot read of leaderboard/{scope}/boards/{boardId}/entries/{uid}.
 * Returns null when Firebase is off, the doc is missing, or parse fails.
 * Rethrows getDoc transport failures for the caller to handle.
 */
export async function getLeaderboardSelfEntry(
  scope: LeaderboardScope,
  gameSize: GameSize,
  role: LeaderboardRole,
  metric: LeaderboardMetric,
  uid: string,
): Promise<LeaderboardEntry | null> {
  if (!isFirebaseConfigured() || !uid) {
    return null;
  }
  const entryRef = doc(boardEntriesCollection(scope, gameSize, role, metric), uid);
  const snap = await getDoc(entryRef);
  if (!snap.exists()) {
    return null;
  }
  return parseLeaderboardEntry(snap.id, snap.data() as Record<string, unknown>, 0);
}

/**
 * Subscribe to leaderboard/{scope}/boards/{boardId}/entries.
 * Returns empty when Firebase is off or the collection does not exist yet.
 */
export function subscribeLeaderboardBoard(
  scope: LeaderboardScope,
  gameSize: GameSize,
  role: LeaderboardRole,
  metric: LeaderboardMetric,
  onChange: (entries: LeaderboardEntry[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (!isFirebaseConfigured()) {
    onChange([]);
    return () => undefined;
  }

  const boardQuery = query(
    boardEntriesCollection(scope, gameSize, role, metric),
    orderBy("value", metric === "avg_answer_time" ? "asc" : "desc"),
    limit(BOARD_LIMIT),
  );

  return onSnapshot(
    boardQuery,
    (snapshot) => {
      const entries: LeaderboardEntry[] = [];
      for (const docSnap of snapshot.docs) {
        const parsed = parseLeaderboardEntry(
          docSnap.id,
          docSnap.data() as Record<string, unknown>,
          entries.length,
        );
        if (parsed) {
          entries.push(parsed);
        }
      }
      onChange(entries);
    },
    (error) => onError(error),
  );
}
