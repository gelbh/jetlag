import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { Home } from "./Home";

const { isFirebaseConfigured, isAuthBootstrapReady } = vi.hoisted(() => ({
  isFirebaseConfigured: vi.fn(() => false),
  isAuthBootstrapReady: vi.fn(() => true),
}));

vi.mock("@/hooks/session/useContinueActiveSession", () => ({
  useContinueActiveSession: () => ({
    session: { id: "local", code: "ABCD" },
    myRole: "seeker",
    continueError: null,
    continuing: false,
    handleContinue: vi.fn(),
  }),
}));

vi.mock("@/navigation/useRouteTransition", () => ({
  useRouteTransition: () => ({ phase: "idle" }),
}));

vi.mock("@/services/core/firebase/authBootstrapState", () => ({
  isFirebaseConfigured,
  isAuthBootstrapReady,
  subscribeAuthBootstrapReady: () => () => undefined,
}));

vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured,
}));

beforeEach(() => {
  isFirebaseConfigured.mockReturnValue(false);
  isAuthBootstrapReady.mockReturnValue(true);
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
});

describe("Home", () => {
  it("renders inset play group with Join Create and Presets links", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </MantineProvider>,
    );
    expect(screen.getByRole("link", { name: /Join session/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Create session/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Browse presets/i })).toBeInTheDocument();
  });

  it("shows continue card with session code when session is active", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </MantineProvider>,
    );
    expect(
      screen.getByRole("button", { name: /Return to map for session ABCD/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("ABCD")).toBeInTheDocument();
    expect(screen.getByText(/^Continue$/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Join session/i })).toBeInTheDocument();
  });

  it("links to friends, leaderboard, and stats", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </MantineProvider>,
    );
    expect(screen.getByRole("link", { name: /friends/i })).toHaveAttribute("href", "/friends");
    expect(screen.getByRole("link", { name: /leaderboard/i })).toHaveAttribute(
      "href",
      "/leaderboard",
    );
    expect(screen.getByRole("link", { name: /^stats$/i })).toHaveAttribute("href", "/stats");
    expect(screen.queryByRole("link", { name: /^premium$/i })).toBeNull();
  });

  it("links to premium when Firebase is configured", () => {
    isFirebaseConfigured.mockReturnValue(true);
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </MantineProvider>,
    );
    expect(screen.getByRole("link", { name: /premium/i })).toHaveAttribute("href", "/premium");
  });

  it("renders entries before Firebase auth bootstrap settles", () => {
    isFirebaseConfigured.mockReturnValue(true);
    isAuthBootstrapReady.mockReturnValue(false);
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </MantineProvider>,
    );
    expect(screen.queryByText(/Starting…/)).toBeNull();
    expect(screen.getByRole("link", { name: /Join session/i })).toBeInTheDocument();
  });

  it("links to privacy, terms, and feedback", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </MantineProvider>,
    );
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute(
      "href",
      "/terms",
    );
    expect(screen.getByRole("link", { name: "Feedback and suggestions" })).toHaveAttribute(
      "href",
      "/feedback",
    );
  });

  it("links to the how-to-play guide, question tools, and FAQ", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      </MantineProvider>,
    );
    const learn = screen.getByRole("navigation", { name: "Learn how to play" });
    expect(within(learn).getByRole("link", { name: "How to play" })).toHaveAttribute(
      "href",
      "/guide",
    );
    expect(within(learn).getByRole("link", { name: "Question tools" })).toHaveAttribute(
      "href",
      "/tools",
    );
    expect(within(learn).getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "/faq");
  });
});
