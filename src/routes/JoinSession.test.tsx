import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JoinSession } from "./JoinSession";
import { renderWithRouter } from "../test/renderWithRouter";

const navigate = vi.fn();
const mockIsFirebaseConfigured = vi.fn(() => false);
const mockEnsureFreshAnonymousUser = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock("../services/core/firebase", () => ({
  isFirebaseConfigured: () => mockIsFirebaseConfigured(),
  ensureAnonymousUser: vi.fn(),
  ensureFreshAnonymousUser: (...args: unknown[]) =>
    mockEnsureFreshAnonymousUser(...args),
}));

vi.mock("../services/firestore/firestoreAnnotations", () => ({
  joinRemoteSessionByCode: vi.fn(),
  lookupRemoteSessionByCode: vi.fn(),
  waitForServerHiderRole: vi.fn(),
}));

describe("JoinSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsFirebaseConfigured.mockReturnValue(false);
    mockEnsureFreshAnonymousUser.mockResolvedValue({ uid: "user-1" });
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
});
