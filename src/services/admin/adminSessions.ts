import { FirebaseError } from "firebase/app";
import { httpsCallable, type HttpsCallableResult } from "firebase/functions";
import { getFirebaseFunctions, isFirebaseConfigured } from "../core/firebase";

function compareSessionsByLastActivity(
  left: AdminSessionSummary,
  right: AdminSessionSummary,
): number {
  const leftActivity = left.lastActivityAt ? Date.parse(left.lastActivityAt) : 0;
  const rightActivity = right.lastActivityAt ? Date.parse(right.lastActivityAt) : 0;
  if (rightActivity !== leftActivity) {
    return rightActivity - leftActivity;
  }

  const leftCreated = left.createdAt ? Date.parse(left.createdAt) : 0;
  const rightCreated = right.createdAt ? Date.parse(right.createdAt) : 0;
  return rightCreated - leftCreated;
}

export type AdminSessionPhase =
  | "waiting"
  | "hiding"
  | "seek"
  | "end-game-pending"
  | "end-game-active";

export type AdminSessionMode = "singleplayer" | "multiplayer";

export interface AdminSessionRoleCounts {
  seeker: number;
  hider: number;
  observer: number;
  admin: number;
}

export interface AdminSessionSummary {
  sessionId: string;
  code: string;
  hostUid: string | null;
  tier: "free" | "premium";
  gameSize: "small" | "medium" | "large";
  createdAt: string | null;
  memberCount: number;
  roleCounts: AdminSessionRoleCounts;
  timerAccumulatedMs: number;
  timerRunningSince: string | null;
  endGameStartedAt: string | null;
  endGameRequestedAt: string | null;
  hostAppVersion: string | null;
  hidingPeriodMinutes: number | null;
  regionPackId: string | null;
  regionPackSubregionId: string | null;
  transitMetroId: string | null;
  gameAreaLabel: string | null;
  phase: AdminSessionPhase;
  lastActivityAt: string | null;
  lastLocationAt: string | null;
  mode: AdminSessionMode;
  isLive: boolean;
  liveMultiplayer: boolean;
}

type ListActiveSessionsRequest = {
  limit?: number;
  pageToken?: string | null;
};

export type ListActiveSessionsResponse = {
  sessions: AdminSessionSummary[];
  nextPageToken: string | null;
};

export async function fetchAdminSessionsPage(
  pageToken: string | null = null,
  limit = 50,
): Promise<ListActiveSessionsResponse> {
  if (!isFirebaseConfigured()) {
    return { sessions: [], nextPageToken: null };
  }

  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<
    ListActiveSessionsRequest,
    ListActiveSessionsResponse
  >(functions, "listActiveSessions");

  try {
    const result: HttpsCallableResult<ListActiveSessionsResponse> =
      await callable({
        limit,
        pageToken,
      });

    return {
      sessions: result.data.sessions ?? [],
      nextPageToken: result.data.nextPageToken ?? null,
    };
  } catch (error) {
    if (error instanceof FirebaseError && error.code === "functions/permission-denied") {
      throw new Error("Admin access required.", { cause: error });
    }

    if (error instanceof FirebaseError && error.code === "functions/unauthenticated") {
      throw new Error("Sign in required.", { cause: error });
    }

    if (
      error instanceof FirebaseError &&
      (error.code === "functions/internal" || error.message?.trim() === "INTERNAL")
    ) {
      throw new Error("Couldn't load live sessions.", { cause: error });
    }

    if (error instanceof FirebaseError && error.code === "functions/not-found") {
      throw new Error(
        "Admin session service isn't available yet. Try again after deploy.",
        { cause: error },
      );
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Couldn't load live sessions.", { cause: error });
  }
}

export async function fetchActiveAdminSessions(): Promise<AdminSessionSummary[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const sessions: AdminSessionSummary[] = [];
  let pageToken: string | null = null;

  try {
    for (;;) {
      const data = await fetchAdminSessionsPage(pageToken);
      sessions.push(...data.sessions);
      pageToken = data.nextPageToken;
      if (!pageToken) {
        break;
      }
    }

    sessions.sort(compareSessionsByLastActivity);
    return sessions;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Couldn't load live sessions.", { cause: error });
  }
}
