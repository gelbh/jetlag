import { describe, expect, it } from "vitest";
import {
  buildMemberUidsAfterHeal,
  memberUidSetsEqual,
  sanitizeReturningMemberUid,
} from "./returningMember";

describe("returningMember", () => {
  it("only honors returning uid when it matches persisted myUid", () => {
    expect(sanitizeReturningMemberUid("uid-old", "uid-old")).toBe("uid-old");
    expect(sanitizeReturningMemberUid("uid-old", "uid-other")).toBeUndefined();
    expect(sanitizeReturningMemberUid(null, "uid-old")).toBeUndefined();
  });

  it("compares member uid sets without order sensitivity", () => {
    expect(memberUidSetsEqual(["b", "a"], ["a", "b"])).toBe(true);
    expect(memberUidSetsEqual(["a"], ["a", "b"])).toBe(false);
  });

  it("removes returning uid when healing membership", () => {
    expect(
      buildMemberUidsAfterHeal(["host", "uid-old"], "uid-new", "uid-old"),
    ).toEqual(["host", "uid-new"]);
  });
});
