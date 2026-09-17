import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagMantineTheme } from "@/theme/mantineTheme";
import { ToolStatusBlock } from "./ToolStatusBlock";

const { mockUsePlayerUiMantine } = vi.hoisted(() => ({
  mockUsePlayerUiMantine: vi.fn(() => false),
}));

vi.mock("@/hooks/feature/usePlayerUiMantine", () => ({
  usePlayerUiMantine: () => mockUsePlayerUiMantine(),
}));

vi.mock("../../../state/mapStore", () => ({
  useMapStore: (selector: (state: { lowPowerMode: boolean }) => unknown) =>
    selector({ lowPowerMode: false }),
}));

const timerState = {
  accumulatedMs: 60_000,
  runningSince: null as number | null,
};

beforeEach(() => {
  mockUsePlayerUiMantine.mockReturnValue(false);
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

describe("ToolStatusBlock", () => {
  it("shows Jetlag brand and role subtitle without LIVE OPS", () => {
    render(
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

    expect(screen.getByText("Jetlag")).toBeInTheDocument();
    expect(screen.getByText("Seeker")).toBeInTheDocument();
    expect(screen.queryByText(/LIVE OPS/i)).not.toBeInTheDocument();
  });

  it("renders headerLeading home control in the brand cell", () => {
    render(
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

  it("shows Session code and Phase dash before start", () => {
    render(
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

    expect(screen.getByText("Session")).toBeInTheDocument();
    expect(screen.getByText("WXYZ")).toBeInTheDocument();
    expect(screen.getByText("WXYZ").closest(".jl-stamp-code")).toBeTruthy();
    expect(screen.getByText("Phase")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
  });

  it("uses Mantine iOS Start control when flag is on", () => {
    mockUsePlayerUiMantine.mockReturnValue(true);
    const { container } = render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
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
        />
      </MantineProvider>,
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
    mockUsePlayerUiMantine.mockReturnValue(true);
    const { container } = render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
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
        />
      </MantineProvider>,
    );

    expect(screen.getByText("Hiding")).toBeInTheDocument();
    expect(screen.queryByText(/Seeker/)).not.toBeInTheDocument();
    expect(container.querySelector(".jl-map-phase-live-dot")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });

  it("shows Moving status without role", () => {
    mockUsePlayerUiMantine.mockReturnValue(true);
    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
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
        />
      </MantineProvider>,
    );

    expect(screen.getByText("Moving")).toBeInTheDocument();
    expect(screen.queryByText(/Seeker/)).not.toBeInTheDocument();
  });

  it("compacts Seeking to Seek under 380px", () => {
    mockUsePlayerUiMantine.mockReturnValue(true);
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

    render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
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
        />
      </MantineProvider>,
    );

    expect(screen.getByText("Seek")).toBeInTheDocument();
    expect(screen.queryByText("Seeking")).not.toBeInTheDocument();
  });

  it("shows Waiting when guests cannot start", () => {
    render(
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

  it("keeps Start at a 44px touch target class without LIVE OPS fantasy", () => {
    render(
      <ToolStatusBlock
        sessionCode="ABCD"
        playerRole="seeker"
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

    const start = screen.getByRole("button", { name: /start/i });
    expect(start.className).toContain("jl-status-header-start");
    expect(start.className).toContain("min-h-11");
    expect(screen.queryByText(/LIVE OPS/i)).not.toBeInTheDocument();
  });

  it("shows Hiding phase and keeps stamp-code on the session code while running", () => {
    render(
      <ToolStatusBlock
        sessionCode="WXYZ"
        playerRole="hider"
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

    const phase = screen.getByText("Hiding");
    expect(phase.classList.contains("jl-status-header-value--action")).toBe(true);
    expect(screen.getByText("Session")).toBeInTheDocument();
    expect(screen.getByText("WXYZ").closest(".jl-stamp-code")).toBeTruthy();
  });

  it("shows Moving phase while a hider relocation is in progress", () => {
    render(
      <ToolStatusBlock
        sessionCode="ABCD"
        playerRole="seeker"
        activeTool="none"
        timerState={{ accumulatedMs: 60_000, runningSince: null }}
        timerRunning={false}
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

    const phase = screen.getByText("Moving");
    expect(phase.classList.contains("jl-status-header-value--action")).toBe(true);
    expect(screen.queryByText("Hiding")).not.toBeInTheDocument();
    expect(screen.queryByText("Seeking")).not.toBeInTheDocument();
  });

  it("reverts Phase to Hiding when moveInProgress clears during hiding", () => {
    const { rerender } = render(
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
      />,
    );

    expect(screen.getByText("Hiding")).toBeInTheDocument();
    expect(screen.queryByText("Moving")).not.toBeInTheDocument();
  });
});
