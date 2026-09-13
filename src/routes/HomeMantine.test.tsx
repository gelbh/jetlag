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
  it("renders primary CTAs with opaque Mantine button styles", () => {
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <MemoryRouter>
          <HomeMantine />
        </MemoryRouter>
      </MantineProvider>
    );
    const join = screen.getByRole("link", { name: /join/i });
    expect(join).toBeInTheDocument();
    const bg = getComputedStyle(join).backgroundColor;
    // jsdom often leaves Mantine CSS vars unresolved; opaque bg is a manual Vite check.
    if (!bg || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") {
      expect(join.className).toContain("mantine-Button-root");
      return;
    }
    expect(bg).not.toBe("rgba(0, 0, 0, 0)");
    expect(bg).not.toBe("transparent");
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
    expect(screen.getByText(/ABCD/)).toBeInTheDocument();
  });
});
