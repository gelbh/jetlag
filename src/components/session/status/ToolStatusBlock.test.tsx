import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ToolStatusBlock } from "./ToolStatusBlock";

vi.mock("../../../state/mapStore", () => ({
  useMapStore: (selector: (state: { lowPowerMode: boolean }) => unknown) =>
    selector({ lowPowerMode: false }),
}));

const timerState = {
  accumulatedMs: 60_000,
  runningSince: null as number | null,
};

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
