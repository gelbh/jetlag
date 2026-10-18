import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionRecord } from "../../domain/map/annotations";

const membership = vi.hoisted(() => ({
  ensureRemoteSessionMembership: vi.fn(),
  ensureRemoteSessionWriteAccess: vi.fn(),
}));

vi.mock("./sessions/membership", () => membership);
vi.mock("./sessions/shared", () => ({
  isFirestorePermissionDenied: (error: unknown) =>
    (error as { code?: string } | null)?.code === "permission-denied",
}));
vi.mock("./firestoreSessions", () => ({}));

import { withSessionWriteAccess } from "./sessionMembershipHeal";

function session(memberRoles: Record<string, "seeker" | "hider">): SessionRecord {
  return {
    id: "sess-1",
    code: "ABCD",
    memberUids: Object.keys(memberRoles),
    memberRoles,
  } as unknown as SessionRecord;
}

describe("withSessionWriteAccess", () => {
  beforeEach(() => {
    membership.ensureRemoteSessionMembership.mockReset();
    membership.ensureRemoteSessionWriteAccess.mockReset();
  });

  it("heals a drifted hider with the old uid's role", async () => {
    const drifted = session({ host: "seeker", "old-hider": "hider" });
    const healed = session({ host: "seeker", "new-hider": "hider" });
    membership.ensureRemoteSessionWriteAccess.mockResolvedValue(healed);
    const write = vi.fn().mockResolvedValue(undefined);

    await withSessionWriteAccess({
      session: drifted,
      uid: "new-hider",
      myUid: "old-hider",
      onSessionChange: vi.fn(),
      write,
    });

    expect(membership.ensureRemoteSessionWriteAccess).toHaveBeenCalledWith(
      drifted,
      "new-hider",
      "hider",
      { returningMemberUid: "old-hider", persistedMyUid: "old-hider" },
    );
    expect(write).toHaveBeenCalledWith("sess-1");
  });

  it("keeps the new uid's role on retry when the session is already healed", async () => {
    const alreadyHealed = session({ host: "seeker", "new-hider": "hider" });
    membership.ensureRemoteSessionMembership.mockResolvedValue(alreadyHealed);
    const write = vi
      .fn()
      .mockRejectedValueOnce({ code: "permission-denied" })
      .mockResolvedValueOnce(undefined);

    await withSessionWriteAccess({
      session: alreadyHealed,
      uid: "new-hider",
      myUid: "old-hider",
      onSessionChange: vi.fn(),
      write,
    });

    expect(membership.ensureRemoteSessionWriteAccess).not.toHaveBeenCalled();
    expect(membership.ensureRemoteSessionMembership).toHaveBeenCalledWith(
      alreadyHealed,
      "new-hider",
      "hider",
      expect.anything(),
    );
    expect(write).toHaveBeenCalledTimes(2);
  });
});
