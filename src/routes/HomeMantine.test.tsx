import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeMantine } from "./HomeMantine";
import { jetlagMantineTheme } from "@/theme/mantineTheme";

const { isFirebaseConfigured } = vi.hoisted(() => ({
  isFirebaseConfigured: vi.fn(() => false),
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

vi.mock("@/hooks/app/useAuthBootstrapReady", () => ({
  useAuthBootstrapReady: () => true,
}));

vi.mock("@/navigation/useRouteTransition", () => ({
  useRouteTransition: () => ({ phase: "idle" }),
}));

vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured,
}));

beforeEach(() => {
  isFirebaseConfigured.mockReturnValue(false);
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

describe("HomeMantine", () => {
  it("renders inset play group with Join Create and Presets links", () => {
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <MemoryRouter>
          <HomeMantine />
        </MemoryRouter>
      </MantineProvider>
    );
    expect(screen.getByRole("link", { name: /Join session/i })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Create session/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Browse presets/i }),
    ).toBeInTheDocument();
  });

  it("shows continue card with session code when session is active", () => {
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <MemoryRouter>
          <HomeMantine />
        </MemoryRouter>
      </MantineProvider>
    );
    expect(
      screen.getByRole("button", { name: /Return to map for session ABCD/i })
    ).toBeInTheDocument();
    expect(screen.getByText("ABCD")).toBeInTheDocument();
    expect(screen.getByText(/^Continue$/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Join session/i })).toBeInTheDocument();
  });

  it("links to friends, leaderboard, and stats", () => {
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <MemoryRouter>
          <HomeMantine />
        </MemoryRouter>
      </MantineProvider>
    );
    expect(screen.getByRole("link", { name: /friends/i })).toHaveAttribute(
      "href",
      "/friends",
    );
    expect(screen.getByRole("link", { name: /leaderboard/i })).toHaveAttribute(
      "href",
      "/leaderboard",
    );
    expect(screen.getByRole("link", { name: /^stats$/i })).toHaveAttribute(
      "href",
      "/stats",
    );
    expect(screen.queryByRole("link", { name: /^premium$/i })).toBeNull();
  });

  it("links to premium when Firebase is configured", () => {
    isFirebaseConfigured.mockReturnValue(true);
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <MemoryRouter>
          <HomeMantine />
        </MemoryRouter>
      </MantineProvider>
    );
    expect(screen.getByRole("link", { name: /premium/i })).toHaveAttribute(
      "href",
      "/premium",
    );
  });

  it("links to privacy, terms, and feedback", () => {
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <MemoryRouter>
          <HomeMantine />
        </MemoryRouter>
      </MantineProvider>
    );
    expect(
      screen.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/privacy");
    expect(
      screen.getByRole("link", { name: "Terms of Service" }),
    ).toHaveAttribute("href", "/terms");
    expect(
      screen.getByRole("link", { name: "Feedback and suggestions" }),
    ).toHaveAttribute("href", "/feedback");
  });
});
