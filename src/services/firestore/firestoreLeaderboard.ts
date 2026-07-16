import {
  collection,
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

function parseEntry(
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
  const value = typeof data.value === "number" ? data.value : Number(data.value);
  if (!uid || !Number.isFinite(value)) {
    return null;
  }
  const rank =
    typeof data.rank === "number" && Number.isFinite(data.rank)
      ? data.rank
      : index + 1;
  return { uid, displayName: displayName || "Player", value, rank };
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

  const boardId = leaderboardBoardKey(scope, gameSize, role, metric).replaceAll(
    "/",
    "_",
  );
  const entriesRef = collection(
    getFirestoreDb(),
    "leaderboard",
    scope,
    "boards",
    boardId,
    "entries",
  );
  const boardQuery = query(
    entriesRef,
    orderBy("value", metric === "avg_answer_time" ? "asc" : "desc"),
    limit(BOARD_LIMIT),
  );

  return onSnapshot(
    boardQuery,
    (snapshot) => {
      const entries: LeaderboardEntry[] = [];
      snapshot.docs.forEach((docSnap, index) => {
        const parsed = parseEntry(
          docSnap.id,
          docSnap.data() as Record<string, unknown>,
          index,
        );
        if (parsed) {
          entries.push(parsed);
        }
      });
      onChange(entries);
    },
    (error) => onError(error),
  );
}
