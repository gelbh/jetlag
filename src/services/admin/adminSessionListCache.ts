import type { AdminSessionSummary } from "./adminSessions";

export type AdminSessionListCacheSnapshot = {
  sessions: AdminSessionSummary[];
  nextPageToken: string | null;
  lastFetchedAt: Date;
};

let snapshot: AdminSessionListCacheSnapshot | null = null;

export function readAdminSessionListCache(): AdminSessionListCacheSnapshot | null {
  if (snapshot == null) {
    return null;
  }
  return {
    sessions: [...snapshot.sessions],
    nextPageToken: snapshot.nextPageToken,
    lastFetchedAt: snapshot.lastFetchedAt,
  };
}

export function writeAdminSessionListCache(
  next: AdminSessionListCacheSnapshot,
): void {
  snapshot = {
    sessions: [...next.sessions],
    nextPageToken: next.nextPageToken,
    lastFetchedAt: next.lastFetchedAt,
  };
}

export function clearAdminSessionListCacheForTests(): void {
  snapshot = null;
}
