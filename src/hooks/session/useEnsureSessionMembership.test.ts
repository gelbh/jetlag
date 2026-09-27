import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useEnsureSessionMembership } from "./useEnsureSessionMembership";

const ensureFreshAnonymousUser = vi.fn();
const healSessionMembership = vi.fn();

vi.mock("../../services/core/firebase/firebase", () => ({
  ensureFreshAnonymousUser: (...args: unknown[]) =>
    ensureFreshAnonymousUser(...args),
  isFirebaseConfigured: vi.fn(() => true),
}));

vi.mock("../../services/firestore/sessionMembershipHeal", () => ({
  healSessionMembership: (...args: unknown[]) => healSessionMembership(...args),
  sessionMembershipChanged: vi.fn(() => false),
}));

vi.mock("../../state/sessionStore", () => ({
  useSessionStore: Object.assign(
    vi.fn(
      (
        selector: (state: {
          session: { id: string; code: string; memberUids: string[] };
          myUid: string;
          myRole: string;
          setSession: () => void;
          setLastSyncError: () => void;
        }) => unknown,
      ) =>
        selector({
          session: { id: "session-1", code: "ABCD", memberUids: ["uid-1"] },
          myUid: "uid-1",
          myRole: "hider",
          setSession: vi.fn(),
          setLastSyncError: vi.fn(),
        }),
    ),
    {
      getState: () => ({
        session: { id: "session-1", code: "ABCD", memberUids: ["uid-1"] },
        myUid: "uid-1",
        myRole: "hider",
      }),
    },
  ),
}));

describe("useEnsureSessionMembership", () => {
  it("skips heal when enabled is false", () => {
    ensureFreshAnonymousUser.mockClear();
    healSessionMembership.mockClear();

    renderHook(() => useEnsureSessionMembership({ enabled: false }));

    expect(ensureFreshAnonymousUser).not.toHaveBeenCalled();
    expect(healSessionMembership).not.toHaveBeenCalled();
  });
});
