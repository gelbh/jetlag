import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";
import { THERMOMETER_WALK_MAX_DURATION_MS } from "../../domain/questions";
import { MapTimerCluster } from "./MapTimerCluster";

vi.mock("../../state/mapStore", () => ({
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
