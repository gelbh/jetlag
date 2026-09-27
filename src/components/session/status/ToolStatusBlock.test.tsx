import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { ToolStatusBlock } from "./ToolStatusBlock";

vi.mock("../../../state/mapStore", () => ({
  useMapStore: (selector: (state: { lowPowerMode: boolean }) => unknown) =>
    selector({ lowPowerMode: false }),
}));

const timerState = {
  accumulatedMs: 60_000,
  runningSince: null as number | null,
};

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: typeof query === "string" && query.includes("min-width: 380"),
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

function renderStatus(ui: React.ReactElement) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

describe("ToolStatusBlock", () => {
  it("renders headerLeading home control in the brand cell", () => {
    renderStatus(
      <ToolStatusBlock
        sessionCode="ABCD"
        playerRole="seeker"
        activeTool="none"
        timerState={timerState}
        timerRunning={false}
        timerHasStarted={false}
        timerSyncing={false}
        canStartGame={false}
        onStartGame={vi.fn()}
        sessionRules={{ gameSize: "medium" }}
        pendingQuestions={[]}
        timerMenuOpen={false}
        onOpenTimerMenu={vi.fn()}
        headerLeading={
          <button type="button" aria-label="Home">
            Home
          </button>
        }
      />,
    );

    const home = screen.getByRole("button", { name: "Home" });
    expect(home).toBeInTheDocument();
    expect(home.closest(".jl-status-header-brand")).toBeTruthy();
  });

  it("uses Mantine iOS Start control", () => {
    const { container } = renderStatus(
      <ToolStatusBlock
        sessionCode="WXYZ"
        playerRole="hider"
        activeTool="none"
        timerState={timerState}
        timerRunning={false}
        timerHasStarted={false}
        timerSyncing={false}
        canStartGame
        onStartGame={vi.fn()}
        sessionRules={{ gameSize: "medium" }}
        pendingQuestions={[]}
        timerMenuOpen={false}
        onOpenTimerMenu={vi.fn()}
      />,
    );

    expect(container.querySelector('[data-testid="tool-status-block-mantine"]')).toBeTruthy();
    expect(container.querySelector(".jl-status-header")).toBeNull();
    const start = screen.getByRole("button", { name: /start/i });
    expect(start).toBeInTheDocument();
    expect(start.className).toContain("jl-map-chrome-press");
    expect(screen.getByText("Ready")).toBeInTheDocument();
    expect(screen.queryByText(/Hider/)).not.toBeInTheDocument();
    expect(screen.getByText("WXYZ")).toBeInTheDocument();
  });

  it("shows Hiding status without role when the hide clock is running", () => {
    const { container } = renderStatus(
      <ToolStatusBlock
        sessionCode="WXYZ"
        playerRole="seeker"
        activeTool="none"
        timerState={{ accumulatedMs: 30_000, runningSince: Date.now() }}
        timerRunning
        timerHasStarted
        timerSyncing={false}
        canStartGame={false}
        onStartGame={vi.fn()}
        sessionRules={{ gameSize: "medium", hidingPeriodMinutes: 90 }}
        pendingQuestions={[]}
        timerMenuOpen={false}
        onOpenTimerMenu={vi.fn()}
      />,
    );

    expect(screen.getByText("Hiding")).toBeInTheDocument();
    expect(screen.queryByText(/Seeker/)).not.toBeInTheDocument();
    expect(container.querySelector(".jl-map-phase-live-dot")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });

  it("shows Moving status without role", () => {
    renderStatus(
      <ToolStatusBlock
        sessionCode="ABCD"
        playerRole="seeker"
        activeTool="none"
        timerState={{ accumulatedMs: 30_000, runningSince: Date.now() }}
        timerRunning
        timerHasStarted
        timerSyncing={false}
        canStartGame={false}
        onStartGame={vi.fn()}
        sessionRules={{ gameSize: "medium", hidingPeriodMinutes: 90 }}
        pendingQuestions={[]}
        timerMenuOpen={false}
        onOpenTimerMenu={vi.fn()}
        moveInProgress
      />,
    );

    expect(screen.getByText("Moving")).toBeInTheDocument();
    expect(screen.queryByText(/Seeker/)).not.toBeInTheDocument();
  });

  it("compacts Seeking to Seek under 380px", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }));

    renderStatus(
      <ToolStatusBlock
        sessionCode="SEEK"
        playerRole="seeker"
        activeTool="none"
        timerState={{ accumulatedMs: 8 * 60_000, runningSince: Date.now() }}
        timerRunning
        timerHasStarted
        timerSyncing={false}
        canStartGame={false}
        onStartGame={vi.fn()}
        sessionRules={{ gameSize: "medium", hidingPeriodMinutes: 1 }}
        pendingQuestions={[]}
        timerMenuOpen={false}
        onOpenTimerMenu={vi.fn()}
      />,
    );

    expect(screen.getByText("Seek")).toBeInTheDocument();
    expect(screen.queryByText("Seeking")).not.toBeInTheDocument();
  });

  it("shows Waiting when guests cannot start", () => {
    renderStatus(
      <ToolStatusBlock
        sessionCode="ABCD"
        playerRole="seeker"
        activeTool="none"
        timerState={timerState}
        timerRunning={false}
        timerHasStarted={false}
        timerSyncing={false}
        canStartGame={false}
        onStartGame={vi.fn()}
        sessionRules={{ gameSize: "medium" }}
        pendingQuestions={[]}
        timerMenuOpen={false}
        onOpenTimerMenu={vi.fn()}
      />,
    );

    expect(screen.getByText("Waiting")).toBeInTheDocument();
  });

  it("reverts Phase to Hiding when moveInProgress clears during hiding", () => {
    const { rerender } = renderStatus(
      <ToolStatusBlock
        sessionCode="ABCD"
        playerRole="seeker"
        activeTool="none"
        timerState={{ accumulatedMs: 30_000, runningSince: Date.now() }}
        timerRunning
        timerHasStarted
        timerSyncing={false}
        canStartGame={false}
        onStartGame={vi.fn()}
        sessionRules={{ gameSize: "medium", hidingPeriodMinutes: 90 }}
        pendingQuestions={[]}
        timerMenuOpen={false}
        onOpenTimerMenu={vi.fn()}
        moveInProgress
      />,
    );

    expect(screen.getByText("Moving")).toBeInTheDocument();

    rerender(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <ToolStatusBlock
          sessionCode="ABCD"
          playerRole="seeker"
          activeTool="none"
          timerState={{ accumulatedMs: 30_000, runningSince: Date.now() }}
          timerRunning
          timerHasStarted
          timerSyncing={false}
          canStartGame={false}
          onStartGame={vi.fn()}
          sessionRules={{ gameSize: "medium", hidingPeriodMinutes: 90 }}
          pendingQuestions={[]}
          timerMenuOpen={false}
          onOpenTimerMenu={vi.fn()}
          moveInProgress={false}
        />
      </MantineProvider>,
    );

    expect(screen.getByText("Hiding")).toBeInTheDocument();
    expect(screen.queryByText("Moving")).not.toBeInTheDocument();
  });
});
