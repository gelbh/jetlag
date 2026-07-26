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
  it("shows JETLAG brand and role subtitle without LIVE OPS", () => {
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

    expect(screen.getByText("JETLAG")).toBeInTheDocument();
    expect(screen.getByText("Seeker")).toBeInTheDocument();
    expect(screen.queryByText(/LIVE OPS/i)).not.toBeInTheDocument();
  });

  it("shows OPERATION session code and PHASE dash before start", () => {
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

    expect(screen.getByText("OPERATION")).toBeInTheDocument();
    expect(screen.getByText("WXYZ")).toBeInTheDocument();
    expect(screen.getByText("PHASE")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
  });

  it("shows WAITING when guests cannot start", () => {
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

    expect(screen.getByText("WAITING")).toBeInTheDocument();
  });
});
