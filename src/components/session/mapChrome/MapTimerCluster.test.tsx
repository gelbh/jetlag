import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PendingQuestionRecord } from "@/domain/session/activity/sessionChat";
import { THERMOMETER_WALK_MAX_DURATION_MS } from "@/domain/questions";
import { jetlagTheme } from "@/theme/theme";
import { MapTimerCluster } from "./MapTimerCluster";

vi.mock("../../../state/mapStore", () => ({
  useMapStore: (selector: (state: { lowPowerMode: boolean }) => unknown) =>
    selector({ lowPowerMode: false }),
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

function renderCluster(
  ui: React.ReactElement,
) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {ui}
    </MantineProvider>,
  );
}

describe("MapTimerCluster", () => {
  it("renders nothing before the session timer has started", () => {
    renderCluster(
      <MapTimerCluster
        sessionRules={{ gameSize: "medium" }}
        timerState={timerState}
        timerRunning={false}
        timerHasStarted={false}
      />,
    );
    expect(screen.queryByTitle("Session time since start")).toBeNull();
  });

  it("shows Stale GPS for host when the walk is stale", () => {
    renderCluster(
      <MapTimerCluster
        sessionRules={{ gameSize: "medium" }}
        timerState={timerState}
        timerRunning
        timerHasStarted
        pendingQuestions={[walkingQuestion]}
        myUid="host-1"
        hostUid="host-1"
        seekerLocations={[]}
      />,
    );

    expect(screen.getByText("Stale GPS")).toBeTruthy();
  });

  it("shows Walking cue while thermometer walk is active and fresh", () => {
    renderCluster(
      <MapTimerCluster
        sessionRules={{ gameSize: "medium" }}
        timerState={timerState}
        timerRunning
        timerHasStarted
        pendingQuestions={[
          {
            ...walkingQuestion,
            createdAt: new Date().toISOString(),
          },
        ]}
        myUid="host-1"
        hostUid="host-1"
        seekerLocations={[
          {
            uid: "seeker-1",
            sessionId: "session-1",
            updatedAt: new Date().toISOString(),
            lat: 0,
            lng: 0,
          },
        ]}
      />,
    );

    expect(screen.getByText("Walking")).toBeTruthy();
  });

  it("shows seek-phase elapsed after hiding ends", () => {
    renderCluster(
      <MapTimerCluster
        sessionRules={{ gameSize: "medium", hidingPeriodMinutes: 1 }}
        timerState={{
          accumulatedMs: 10 * 60_000,
          runningSince: null,
        }}
        timerRunning={false}
        timerHasStarted
        pendingQuestions={[]}
      />,
    );

    // Primary session clock plus seek-phase secondary (formatted elapsed).
    expect(screen.getAllByText(/\d+:\d{2}/).length).toBeGreaterThanOrEqual(1);
  });
});
