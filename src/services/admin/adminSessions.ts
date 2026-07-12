import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions, isFirebaseConfigured } from "../core/firebase";

export type AdminSessionPhase =
  | "waiting"
  | "hiding"
  | "seek"
  | "end-game-pending"
  | "end-game-active";

export interface AdminSessionRoleCounts {
  seeker: number;
  hider: number;
  observer: number;
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
}

export async function fetchActiveAdminSessions(): Promise<AdminSessionSummary[]> {
  if (!isFirebaseConfigured()) {
    return [];
  }

  const functions = getFirebaseFunctions();
  const callable = httpsCallable<Record<string, never>, { sessions: AdminSessionSummary[] }>(
    functions,
    "listActiveSessions",
  );

  try {
    const result = await callable({});
    return result.data.sessions ?? [];
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
