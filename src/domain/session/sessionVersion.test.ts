import { describe, expect, it } from "vitest";
import {
  compareAppVersions,
  sessionVersionCompatible,
  sessionVersionMismatchMessage,
} from "./sessionVersion";

describe("compareAppVersions", () => {
  it("ignores prerelease suffixes", () => {
    expect(compareAppVersions("0.5.6-beta", "0.5.6")).toBe(0);
    expect(compareAppVersions("0.5.6", "0.5.6-rc.1")).toBe(0);
  });

  it("orders major, minor, and patch numerically", () => {
    expect(compareAppVersions("0.5.6", "0.5.1")).toBe(1);
    expect(compareAppVersions("0.5.0", "0.5.1")).toBe(-1);
    expect(compareAppVersions("1.0.0", "0.9.9")).toBe(1);
  });
});

describe("sessionVersionCompatible", () => {
  const session = {
    hostAppVersion: "0.2.1",
    memberUids: ["host-1", "member-1"],
  };

  it("allows existing members regardless of client version", () => {
    expect(sessionVersionCompatible(session, "0.2.0", "member-1")).toBe(true);
    expect(sessionVersionCompatible(session, "0.9.9", "host-1")).toBe(true);
  });

  it("blocks new joiners when client version is older than host", () => {
    expect(sessionVersionCompatible(session, "0.2.0", "new-uid")).toBe(false);
    expect(
      sessionVersionCompatible(
        { hostAppVersion: "0.5.1", memberUids: [] },
        "0.5.0",
        "new-uid",
      ),
    ).toBe(false);
  });

  it("allows new joiners when client version matches host", () => {
    expect(sessionVersionCompatible(session, "0.2.1", "new-uid")).toBe(true);
  });

  it("allows new joiners when client version is newer than host", () => {
    expect(
      sessionVersionCompatible(
        { hostAppVersion: "0.5.1", memberUids: [] },
        "0.5.6",
        "new-uid",
      ),
    ).toBe(true);
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

  it("allows auth drift when the prior uid was already a member", () => {
    expect(sessionVersionCompatible(session, "0.9.9", "new-uid", "member-1")).toBe(
      true,
    );
  });

  it("allows observers to join regardless of version mismatch", () => {
    expect(
      sessionVersionCompatible(session, "0.2.0", "new-uid", undefined, "observer"),
    ).toBe(true);
  });

  it("allows admins to join regardless of version mismatch", () => {
    expect(
      sessionVersionCompatible(session, "0.2.0", "new-uid", undefined, "admin"),
    ).toBe(true);
  });
});

describe("sessionVersionMismatchMessage", () => {
  it("includes the host version", () => {
    expect(sessionVersionMismatchMessage("0.2.1")).toContain("0.2.1");
  });

  it("prompts update when client is older than host", () => {
    expect(sessionVersionMismatchMessage("0.5.1", "0.5.0")).toContain(
      "requires v0.5.1 or newer",
    );
  });

  it("prompts host refresh when client is newer than host", () => {
    expect(sessionVersionMismatchMessage("0.5.1", "0.5.6")).toContain(
      "created on v0.5.1",
    );
  });
});
