import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAdminSessionListCacheForTests,
  readAdminSessionListCache,
  writeAdminSessionListCache,
} from "./adminSessionListCache";
import type { AdminSessionSummary } from "./adminSessions";

const sample = {
  sessionId: "s1",
  code: "ABCD",
} as AdminSessionSummary;

describe("adminSessionListCache", () => {
  beforeEach(() => {
    clearAdminSessionListCacheForTests();
  });

  it("returns null when empty", () => {
    expect(readAdminSessionListCache()).toBeNull();
  });

  it("round-trips a snapshot and clones the sessions array", () => {
    const sessions = [sample];
    const lastFetchedAt = new Date("2026-07-26T12:00:00.000Z");
    writeAdminSessionListCache({
      sessions,
      nextPageToken: "page-2",
      lastFetchedAt,
    });
    sessions.push({ ...sample, sessionId: "mutated" } as AdminSessionSummary);

    const cached = readAdminSessionListCache();
    expect(cached).toEqual({
      sessions: [sample],
      nextPageToken: "page-2",
      lastFetchedAt,
    });
    expect(cached?.sessions).not.toBe(sessions);
  });

  it("clearAdminSessionListCacheForTests empties the snapshot", () => {
    writeAdminSessionListCache({
      sessions: [sample],
      nextPageToken: null,
      lastFetchedAt: new Date(),
    });
    clearAdminSessionListCacheForTests();
    expect(readAdminSessionListCache()).toBeNull();
  });
});
