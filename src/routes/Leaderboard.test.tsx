import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Leaderboard } from "./Leaderboard";
import { jetlagTheme } from "@/theme/theme";

vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => false,
}));

vi.mock("@/hooks/billing/usePermanentAuthUser", () => ({
  usePermanentAuthUser: () => ({
    user: null,
    isPermanent: false,
    authReady: true,
  }),
}));

vi.mock("./LeaderboardBoard", () => ({
  LeaderboardBoard: () => <div data-testid="leaderboard-board">Board</div>,
}));

vi.mock("../components/leaderboard/LeaderboardBody", () => ({
  LeaderboardBody: () => <div data-testid="leaderboard-body">Board</div>,
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

describe("Leaderboard", () => {
  it("renders Mantine shell", () => {
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <MemoryRouter>
          <Leaderboard />
        </MemoryRouter>
      </MantineProvider>,
    );
    expect(
      screen.getByRole("heading", { name: "Leaderboard" }),
    ).toBeInTheDocument();
  });
});
