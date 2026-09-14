import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HomeMantine } from "./HomeMantine";
import { jetlagMantineTheme } from "@/theme/mantineTheme";

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
  isFirebaseConfigured: () => false,
}));

beforeEach(() => {
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
});
