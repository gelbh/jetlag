import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JoinSession } from "./JoinSession";
import { renderWithRouter } from "../test/renderWithRouter";

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock("../services/core/firebase", () => ({
  isFirebaseConfigured: () => false,
  ensureAnonymousUser: vi.fn(),
}));

describe("JoinSession", () => {
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
});
