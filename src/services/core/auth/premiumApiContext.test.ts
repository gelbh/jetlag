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
  await vi.advanceTimersByTimeAsync(0);
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
    expect(await isSettled(waitForSessionMembership(() => "me", 10_000))).toBe(true);
  });

  it("resolves immediately when there is no signed-in user", async () => {
    setPremiumApiContext(session(["old"]));
    expect(await isSettled(waitForSessionMembership(() => undefined, 10_000))).toBe(true);
  });

  it("resolves when a later session update lists the uid and clears its timer", async () => {
    setPremiumApiContext(session(["old"]));
    const wait = waitForSessionMembership(() => "new", 10_000);
    expect(await isSettled(wait)).toBe(false);

    setPremiumApiContext(session(["new"]));
    expect(await isSettled(wait)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resolves at the timeout, then skips the wait for the same session and uid", async () => {
    setPremiumApiContext(session(["old"]));
    const wait = waitForSessionMembership(() => "kicked", 10_000);
    vi.advanceTimersByTime(9_999);
    expect(await isSettled(wait)).toBe(false);

    vi.advanceTimersByTime(1);
    expect(await isSettled(wait)).toBe(true);
    expect(await isSettled(waitForSessionMembership(() => "kicked", 10_000))).toBe(true);
  });

  it("does not skip the wait for a uid that only appeared after the wait started", async () => {
    let uid = "before";
    setPremiumApiContext(session(["old"]));
    const wait = waitForSessionMembership(() => uid, 10_000);
    uid = "after";
    vi.advanceTimersByTime(10_000);
    expect(await isSettled(wait)).toBe(true);

    expect(await isSettled(waitForSessionMembership(() => "after", 10_000))).toBe(false);
  });

  it("keeps waiting across a session switch until the uid joins the new session", async () => {
    setPremiumApiContext(session(["old"], "s1"));
    const wait = waitForSessionMembership(() => "switcher", 10_000);

    setPremiumApiContext(session(["old"], "s2"));
    expect(await isSettled(wait)).toBe(false);

    setPremiumApiContext(session(["switcher"], "s2"));
    expect(await isSettled(wait)).toBe(true);
  });

  it("checks the current uid when the signed-in user changes mid-wait", async () => {
    let uid = "stale";
    setPremiumApiContext(session(["old"]));
    const wait = waitForSessionMembership(() => uid, 10_000);

    uid = "fresh";
    setPremiumApiContext(session(["old", "fresh"]));
    expect(await isSettled(wait)).toBe(true);
  });

  it("resolves when the session is cleared", async () => {
    setPremiumApiContext(session(["old"]));
    const wait = waitForSessionMembership(() => "new", 10_000);
    setPremiumApiContext(null);
    expect(await isSettled(wait)).toBe(true);
  });
});
