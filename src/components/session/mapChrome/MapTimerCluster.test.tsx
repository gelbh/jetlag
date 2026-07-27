import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PendingQuestionRecord } from "../../../domain/session/sessionChat";
import { THERMOMETER_WALK_MAX_DURATION_MS } from "../../../domain/questions";
import { MapTimerCluster } from "./MapTimerCluster";

vi.mock("../../../state/mapStore", () => ({
  useMapStore: (selector: (state: { lowPowerMode: boolean }) => unknown) =>
    selector({ lowPowerMode: false }),
}));

const walkingQuestion: PendingQuestionRecord = {
  id: "pq-walk",
  sessionId: "session-1",
  toolType: "thermometer",
  createdByUid: "seeker-1",
  createdAt: new Date(Date.now() - THERMOMETER_WALK_MAX_DURATION_MS).toISOString(),
  status: "walking",
  placement: { geometryJson: "{}", metadata: {} },
  replyOptions: [],
  promptText: "Thermometer walk started",
};

const timerState = {
  accumulatedMs: 60_000,
  runningSince: null as number | null,
};

describe("MapTimerCluster thermometer cancel", () => {
  it("shows Cancel for host on a walking thermometer", () => {
    const onCancel = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <MapTimerCluster
        sessionRules={{ gameSize: "medium" }}
        timerState={timerState}
        timerRunning
        timerHasStarted
        pendingQuestions={[walkingQuestion]}
        myUid="host-1"
        hostUid="host-1"
        onCancelWalkingQuestion={onCancel}
        onOpenTimerMenu={vi.fn()}
        timerMenuOpen={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Cancel thermometer walk" })).toBeTruthy();
    screen.getByRole("button", { name: "Cancel thermometer walk" }).click();
    expect(onCancel).toHaveBeenCalledWith("pq-walk");
  });

  it("shows STUCK? for host when the walk is stale", () => {
    render(
      <MapTimerCluster
        sessionRules={{ gameSize: "medium" }}
        timerState={timerState}
        timerRunning
        timerHasStarted
        pendingQuestions={[walkingQuestion]}
        myUid="host-1"
        hostUid="host-1"
        seekerLocations={[]}
        onCancelWalkingQuestion={vi.fn()}
        onOpenTimerMenu={vi.fn()}
        timerMenuOpen={false}
      />,
    );

    expect(screen.getByText("STUCK?")).toBeTruthy();
  });

  it("shows Cancel for the walk creator even when not host", () => {
    const onCancel = vi.fn();

    render(
      <MapTimerCluster
        sessionRules={{ gameSize: "medium" }}
        timerState={timerState}
        timerRunning
        timerHasStarted
        pendingQuestions={[walkingQuestion]}
        myUid="seeker-1"
        hostUid="host-1"
        onCancelWalkingQuestion={onCancel}
        onOpenTimerMenu={vi.fn()}
        timerMenuOpen={false}
      />,
    );

    expect(screen.getByRole("button", { name: "Cancel thermometer walk" })).toBeTruthy();
  });

  it("hides Cancel for non-host non-creator seekers", () => {
    render(
      <MapTimerCluster
        sessionRules={{ gameSize: "medium" }}
        timerState={timerState}
        timerRunning
        timerHasStarted
        pendingQuestions={[walkingQuestion]}
        myUid="seeker-2"
        hostUid="host-1"
        onCancelWalkingQuestion={vi.fn()}
        onOpenTimerMenu={vi.fn()}
        timerMenuOpen={false}
      />,
    );

    expect(screen.queryByRole("button", { name: "Cancel thermometer walk" })).toBeNull();
  });
});

describe("MapTimerCluster dual stack", () => {
  it("stacks SESSION secondary under hiding countdown", () => {
    const { container } = render(
      <MapTimerCluster
        sessionRules={{ gameSize: "medium", hidingPeriodMinutes: 90 }}
        timerState={{ accumulatedMs: 60_000, runningSince: Date.now() }}
        timerRunning
        timerHasStarted
        pendingQuestions={[]}
        onOpenTimerMenu={vi.fn()}
        timerMenuOpen={false}
      />,
    );

    expect(screen.getByText("SESSION")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Session elapsed/i }),
    ).toBeTruthy();
    const cluster = container.querySelector(".jl-timer-cluster");
    expect(cluster).toBeTruthy();
    const children = cluster?.children ?? [];
    expect(children.length).toBeGreaterThanOrEqual(2);
    expect(children[0]?.classList.contains("jl-ticker-hiding")).toBe(true);
    expect(children[1]?.classList.contains("jl-ticker-secondary")).toBe(true);
  });

  it("shows SEEK primary without SESSION when hiding is over", () => {
    render(
      <MapTimerCluster
        sessionRules={{ gameSize: "medium", hidingPeriodMinutes: 1 }}
        timerState={{
          accumulatedMs: 10 * 60_000,
          runningSince: null,
        }}
        timerRunning={false}
        timerHasStarted
        pendingQuestions={[]}
        onOpenTimerMenu={vi.fn()}
        timerMenuOpen={false}
      />,
    );

    expect(screen.getByText("SEEK")).toBeTruthy();
    expect(screen.queryByText("SESSION")).toBeNull();
  });

  it("renders Cancel outside the timer cluster row", () => {
    const { container } = render(
      <MapTimerCluster
        sessionRules={{ gameSize: "medium" }}
        timerState={timerState}
        timerRunning
        timerHasStarted
        pendingQuestions={[walkingQuestion]}
        myUid="host-1"
        hostUid="host-1"
        onCancelWalkingQuestion={vi.fn()}
        onOpenTimerMenu={vi.fn()}
        timerMenuOpen={false}
      />,
    );

    const cancel = screen.getByRole("button", {
      name: "Cancel thermometer walk",
    });
    expect(cancel.classList.contains("jl-timer-cancel")).toBe(true);
    expect(cancel.closest(".jl-timer-cluster")).toBeNull();
    expect(container.querySelector(".jl-timer-cluster")).toBeTruthy();
  });
});
