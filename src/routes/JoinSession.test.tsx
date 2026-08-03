import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JoinSession } from "./JoinSession";
import { renderWithRouter } from "../test/renderWithRouter";
import { createTestRemoteSession } from "../test/fixtures/sessions";
import { clearJoinPreviewCacheForTests } from "../services/session/joinSessionPreviewCache";
import {
  lookupRemoteSessionByCode,
  waitForServerHiderRole,
  getRemoteSessionByIdFromServer,
} from "../services/firestore/firestoreAnnotations";

const navigate = vi.fn();
const mockIsFirebaseConfigured = vi.fn(() => false);
const mockEnsureFreshAnonymousUser = vi.fn();
const mockEnsureAnonymousUser = vi.fn();
const mockRequestRoleJoin = vi.fn();
const mockCancelRoleJoinRequest = vi.fn();
const mockListenOwnJoinRequest = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock("../hooks/navigation/useAppNavigate", () => ({
  useAppNavigate: () => navigate,
}));

vi.mock("../services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => mockIsFirebaseConfigured(),
  ensureAnonymousUser: (...args: unknown[]) => mockEnsureAnonymousUser(...args),
  ensureFreshAnonymousUser: (...args: unknown[]) =>
    mockEnsureFreshAnonymousUser(...args),
}));

vi.mock("../services/firestore/firestoreAnnotations", () => ({
  joinRemoteSessionByCode: vi.fn(),
  lookupRemoteSessionByCode: vi.fn(),
  waitForServerHiderRole: vi.fn(),
  getRemoteSessionByIdFromServer: vi.fn(),
}));

vi.mock("../services/session/rolePasscodeLifecycle", async () => {
  const actual = await vi.importActual<
    typeof import("../services/session/rolePasscodeLifecycle")
  >("../services/session/rolePasscodeLifecycle");
  return {
    ...actual,
    requestRoleJoin: (...args: unknown[]) => mockRequestRoleJoin(...args),
    cancelRoleJoinRequest: (...args: unknown[]) =>
      mockCancelRoleJoinRequest(...args),
  };
});

vi.mock("../services/session/joinRequestListen", () => ({
  listenOwnJoinRequest: (...args: unknown[]) =>
    mockListenOwnJoinRequest(...args),
}));

const gatedPreviewSession = createTestRemoteSession({
  id: "sess-gated",
  code: "ABCD",
  memberUids: ["host-1", "seeker-1"],
  memberRoles: { "host-1": "hider", "seeker-1": "seeker" },
  roleGates: {
    version: 1,
    leaders: { hider: "host-1", seeker: "seeker-1" },
  },
});

async function enterCodeAndWaitForPreview() {
  fireEvent.change(screen.getByPlaceholderText("ABCD"), {
    target: { value: "ABCD" },
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Request access" })).toBeInTheDocument();
  });
}

describe("JoinSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearJoinPreviewCacheForTests();
    mockIsFirebaseConfigured.mockReturnValue(false);
    mockEnsureFreshAnonymousUser.mockResolvedValue({ uid: "user-1" });
    mockEnsureAnonymousUser.mockResolvedValue({ uid: "user-1" });
    mockRequestRoleJoin.mockResolvedValue({
      requestId: "req-1",
      expiresAt: "2099-01-01T00:10:00.000Z",
    });
    mockCancelRoleJoinRequest.mockResolvedValue(undefined);
    mockListenOwnJoinRequest.mockReturnValue(() => undefined);
    vi.mocked(lookupRemoteSessionByCode).mockResolvedValue({
      status: "found",
      session: gatedPreviewSession,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows firebase configuration error when remote join is unavailable", async () => {
    renderWithRouter(<JoinSession />);

    fireEvent.change(screen.getByPlaceholderText("ABCD"), {
      target: { value: "ABCD" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Join session" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Firebase is not configured. Create a local session instead.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("validates session code length", async () => {
    renderWithRouter(<JoinSession />);
    fireEvent.click(screen.getByRole("button", { name: "Join session" }));

    await waitFor(() => {
      expect(screen.getByText("Enter a 4-letter session code.")).toBeInTheDocument();
    });
  });

  it("offers observer as a join role", () => {
    renderWithRouter(<JoinSession />);

    expect(
      screen.getByRole("radio", { name: /observer/i }),
    ).toBeInTheDocument();
  });

  it("clears join loading when ensureFreshAnonymousUser times out", async () => {
    vi.useFakeTimers();
    mockIsFirebaseConfigured.mockReturnValue(true);
    mockEnsureFreshAnonymousUser.mockImplementation(
      () => new Promise(() => undefined),
    );

    renderWithRouter(<JoinSession />);
    fireEvent.change(screen.getByPlaceholderText("ABCD"), {
      target: { value: "ABCD" },
    });
    const joinButton = screen.getByRole("button", { name: "Join session" });
    fireEvent.click(joinButton);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000);
    });

    expect(
      screen.getByText(
        "Couldn't verify the session. Check your connection and try again.",
      ),
    ).toBeInTheDocument();
    expect(joinButton).not.toBeDisabled();
  });

  it("requests access and waits until cancelled", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockIsFirebaseConfigured.mockReturnValue(true);

    renderWithRouter(<JoinSession />);
    await enterCodeAndWaitForPreview();

    fireEvent.click(screen.getByRole("button", { name: "Request access" }));

    await waitFor(() => {
      expect(mockRequestRoleJoin).toHaveBeenCalledWith("sess-gated", "hider");
      expect(
        screen.getByText("Waiting for hider leader…"),
      ).toBeInTheDocument();
    });

    expect(mockListenOwnJoinRequest).toHaveBeenCalledWith(
      "sess-gated",
      "req-1",
      expect.any(Function),
      expect.any(Function),
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel request" }));

    await waitFor(() => {
      expect(mockCancelRoleJoinRequest).toHaveBeenCalledWith(
        "sess-gated",
        "req-1",
      );
      expect(screen.getByText("Join request cancelled.")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Request access" }),
      ).toBeInTheDocument();
    });
  });

  it("restores the form when the leader declines", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockIsFirebaseConfigured.mockReturnValue(true);
    let onChange:
      | ((request: {
          id: string;
          sessionId: string;
          requesterUid: string;
          role: "hider";
          status: string;
          identityLabel: string;
          createdAt: string;
          expiresAt: string;
        }) => void)
      | null = null;
    mockListenOwnJoinRequest.mockImplementation(
      (_sessionId, _requestId, nextOnChange) => {
        onChange = nextOnChange;
        return () => undefined;
      },
    );

    renderWithRouter(<JoinSession />);
    await enterCodeAndWaitForPreview();

    fireEvent.click(screen.getByRole("button", { name: "Request access" }));

    await waitFor(() => {
      expect(screen.getByText("Waiting for hider leader…")).toBeInTheDocument();
    });

    await act(async () => {
      onChange?.({
        id: "req-1",
        sessionId: "sess-gated",
        requesterUid: "user-1",
        role: "hider",
        status: "declined",
        identityLabel: "ada",
        createdAt: "2026-08-03T12:00:00.000Z",
        expiresAt: "2099-01-01T00:10:00.000Z",
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText("Your join request was declined."),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Request access" }),
      ).toBeInTheDocument();
    });
  });

  it("navigates to the map when the join request is accepted", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockIsFirebaseConfigured.mockReturnValue(true);
    let onChange:
      | ((request: {
          id: string;
          sessionId: string;
          requesterUid: string;
          role: "hider";
          status: string;
          identityLabel: string;
          createdAt: string;
          expiresAt: string;
        }) => void)
      | null = null;
    mockListenOwnJoinRequest.mockImplementation(
      (_sessionId, _requestId, nextOnChange) => {
        onChange = nextOnChange;
        return () => undefined;
      },
    );
    const joinedSession = createTestRemoteSession({
      ...gatedPreviewSession,
      memberUids: ["host-1", "seeker-1", "user-1"],
      memberRoles: {
        "host-1": "hider",
        "seeker-1": "seeker",
        "user-1": "hider",
      },
    });
    vi.mocked(getRemoteSessionByIdFromServer).mockResolvedValue(joinedSession);
    vi.mocked(waitForServerHiderRole).mockResolvedValue(joinedSession);

    renderWithRouter(<JoinSession />);
    await enterCodeAndWaitForPreview();

    fireEvent.click(screen.getByRole("button", { name: "Request access" }));

    await waitFor(() => {
      expect(screen.getByText("Waiting for hider leader…")).toBeInTheDocument();
    });

    await act(async () => {
      onChange?.({
        id: "req-1",
        sessionId: "sess-gated",
        requesterUid: "user-1",
        role: "hider",
        status: "accepted",
        identityLabel: "ada",
        createdAt: "2026-08-03T12:00:00.000Z",
        expiresAt: "2099-01-01T00:10:00.000Z",
      });
    });

    await waitFor(() => {
      expect(getRemoteSessionByIdFromServer).toHaveBeenCalledWith("sess-gated");
      expect(waitForServerHiderRole).toHaveBeenCalledWith(
        "sess-gated",
        "user-1",
      );
      expect(navigate).toHaveBeenCalledWith("/map");
    });
  });
});
