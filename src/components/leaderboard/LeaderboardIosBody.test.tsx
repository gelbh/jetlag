import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagMantineTheme } from "@/theme/mantineTheme";
import { LeaderboardIosBody } from "./LeaderboardIosBody";
import { LEADERBOARD_MOCK_STORAGE_KEY } from "@/services/profile/leaderboardMock";

vi.mock("@/hooks/billing/usePermanentAuthUser", () => ({
  usePermanentAuthUser: () => ({
    user: null,
    isPermanent: false,
    authReady: true,
  }),
}));

vi.mock("@/services/core/firebase/firebase", () => ({
  isFirebaseConfigured: () => false,
}));

function renderBody(initialEntry = "/leaderboard") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <LeaderboardIosBody />
      </MantineProvider>
    </MemoryRouter>,
  );
}

describe("LeaderboardIosBody", () => {
  beforeEach(() => {
    localStorage.setItem(LEADERBOARD_MOCK_STORAGE_KEY, "1");
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
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
  });

  it("loads mock ranks and opens a player sheet", async () => {
    renderBody();

    await waitFor(() => {
      expect(screen.getByTestId("leaderboard-podium")).toBeInTheDocument();
      expect(screen.getByText("ally_fox")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("ally_fox"));
    expect(await screen.findByRole("button", { name: "Add friend" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open friends" })).toBeInTheDocument();

    const sheet = document.querySelector(".mantine-Drawer-content");
    expect(sheet).toBeTruthy();
    expect((sheet as HTMLElement).style.flex).toContain("100%");
  });

  it("jumps to a matching player without hiding the podium", async () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    renderBody();

    await waitFor(() => {
      expect(screen.getByTestId("leaderboard-podium")).toBeInTheDocument();
      expect(screen.getByText("ally_fox")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Search players"), {
      target: { value: "ally" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Jump to player" }));

    expect(screen.getByTestId("leaderboard-podium")).toBeInTheDocument();
    expect(screen.getByText("map_runner")).toBeInTheDocument();
    expect(screen.getByText(/#1 · ally_fox/)).toBeInTheDocument();
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalled();
    });
    expect(
      screen.getByTestId("leaderboard-podium-1").getAttribute("data-highlighted"),
    ).toBe("true");
  });

  it("reports when no player matches the jump query", async () => {
    renderBody();

    await waitFor(() => {
      expect(screen.getByText("ally_fox")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Search players"), {
      target: { value: "zzz_nobody" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Jump to player" }));

    expect(screen.getByText(/No player matching/)).toBeInTheDocument();
    expect(screen.getByTestId("leaderboard-podium")).toBeInTheDocument();
  });

  it("opens the board picker from the facet card", async () => {
    renderBody();

    await waitFor(() => {
      expect(screen.getByText("ally_fox")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Choose board/i }));
    expect(screen.getByText("Choose board")).toBeInTheDocument();
    expect(screen.getByLabelText("Game size")).toBeInTheDocument();
    expect(screen.getByLabelText("Leaderboard metric")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Distance traveled/i })).toBeInTheDocument();
    expect(screen.getByText("Current board")).toBeInTheDocument();
  });
});
