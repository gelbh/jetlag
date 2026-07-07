import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Home } from "./Home";
import { LOCAL_SESSION_ID } from "../domain/annotations";
import { renderWithRouter } from "../test/renderWithRouter";
import { createTestSession } from "../test/fixtures/sessions";
import { useSessionStore } from "../state/sessionStore";

vi.mock("../services/firebase", () => ({
  isFirebaseConfigured: () => false,
  ensureAnonymousUser: vi.fn(),
}));

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

describe("Home", () => {
  it("renders create and join actions", () => {
    renderWithRouter(<Home />);

    expect(screen.getByRole("link", { name: "Create session" })).toHaveAttribute(
      "href",
      "/create",
    );
    expect(screen.getByRole("link", { name: "Join session" })).toHaveAttribute(
      "href",
      "/join",
    );
    expect(screen.getByRole("link", { name: "Custom game presets" })).toHaveAttribute(
      "href",
      "/presets",
    );
  });

  it("continues a local session without remote verification", () => {
    useSessionStore.getState().setSession(createTestSession());

    renderWithRouter(<Home />, { resetStores: false });
    fireEvent.click(
      screen.getByRole("button", { name: /Return to map for session TEST/i }),
    );

    expect(navigate).toHaveBeenCalledWith("/map");
  });

  it("shows resume action when a session exists", () => {
    useSessionStore.getState().setSession(
      createTestSession({ id: LOCAL_SESSION_ID, code: "WXYZ" }),
    );

    renderWithRouter(<Home />, { resetStores: false });
    expect(screen.getByText("WXYZ")).toBeInTheDocument();
  });

  it("links to GitHub Issues for feedback", () => {
    renderWithRouter(<Home />);

    expect(
      screen.getByRole("link", {
        name: "Send feedback on GitHub",
      }),
    ).toHaveAttribute("href", "https://github.com/gelbh/jetlag/issues/new");
  });
});
