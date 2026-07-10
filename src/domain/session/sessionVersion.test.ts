import { describe, expect, it } from "vitest";
import {
  sessionVersionCompatible,
  sessionVersionMismatchMessage,
} from "./sessionVersion";

describe("sessionVersionCompatible", () => {
  const session = {
    hostAppVersion: "0.2.1",
    memberUids: ["host-1", "member-1"],
  };

  it("allows existing members regardless of client version", () => {
    expect(sessionVersionCompatible(session, "0.2.0", "member-1")).toBe(true);
    expect(sessionVersionCompatible(session, "0.9.9", "host-1")).toBe(true);
  });

  it("blocks new joiners when versions mismatch", () => {
    expect(sessionVersionCompatible(session, "0.2.0", "new-uid")).toBe(false);
  });

  it("allows new joiners when versions match", () => {
    expect(sessionVersionCompatible(session, "0.2.1", "new-uid")).toBe(true);
  });

  it("allows join when hostAppVersion is missing (legacy session)", () => {
    expect(
      sessionVersionCompatible(
        { hostAppVersion: undefined, memberUids: ["host-1"] },
        "0.2.0",
        "new-uid",
      ),
    ).toBe(true);
  });
});

describe("sessionVersionMismatchMessage", () => {
  it("includes the host version", () => {
    expect(sessionVersionMismatchMessage("0.2.1")).toContain("0.2.1");
  });
});
