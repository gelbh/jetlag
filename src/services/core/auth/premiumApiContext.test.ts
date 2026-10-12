import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionRecord } from "@/domain/map/annotations";
import { setPremiumApiContext, waitForSessionMembership } from "./premiumApiContext";

function session(memberUids: string[], id = "s1"): SessionRecord {
  return { id, tier: "free", memberUids } as unknown as SessionRecord;
}

async function isSettled(promise: Promise<void>): Promise<boolean> {
  let settled = false;
  void promise.then(() => {
    settled = true;
  });
  await Promise.resolve();
  await Promise.resolve();
  return settled;
}

describe("waitForSessionMembership", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    setPremiumApiContext(null);
    vi.useRealTimers();
  });

  it("resolves immediately when the uid is already a member", async () => {
    setPremiumApiContext(session(["me"]));
    expect(await isSettled(waitForSessionMembership("me", 10_000))).toBe(true);
  });

  it("resolves when a later session update lists the uid", async () => {
    setPremiumApiContext(session(["old"]));
    const wait = waitForSessionMembership("new", 10_000);
    expect(await isSettled(wait)).toBe(false);

    setPremiumApiContext(session(["new"]));
    expect(await isSettled(wait)).toBe(true);
  });

  it("resolves at the timeout when membership never arrives", async () => {
    setPremiumApiContext(session(["old"]));
    const wait = waitForSessionMembership("new", 10_000);
    vi.advanceTimersByTime(9_999);
    expect(await isSettled(wait)).toBe(false);

    vi.advanceTimersByTime(1);
    expect(await isSettled(wait)).toBe(true);
  });

  it("resolves when the session is cleared", async () => {
    setPremiumApiContext(session(["old"]));
    const wait = waitForSessionMembership("new", 10_000);
    setPremiumApiContext(null);
    expect(await isSettled(wait)).toBe(true);
  });
});
