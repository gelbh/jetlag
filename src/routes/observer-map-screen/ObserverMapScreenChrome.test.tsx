import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SessionRecord } from "@/domain/map/annotations";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { ObserverMapScreenChrome } from "./ObserverMapScreenChrome";

vi.mock("@/services/firestore/firestoreSessions", () => ({
  updateCastleSiegeSetup: vi.fn(async () => undefined),
  writeTeamSealHash: vi.fn(async () => undefined),
  startCastleSiegeStandoff: vi.fn(async () => undefined),
}));

const squareGameArea = {
  type: "Polygon" as const,
  coordinates: [
    [
      [0, 0],
      [0.2, 0],
      [0.2, 0.2],
      [0, 0.2],
      [0, 0],
    ],
  ],
};

function baseSession(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "session-1",
    code: "KAJQ",
    hostUid: "host-1",
    createdAt: "2026-10-20T00:00:00.000Z",
    status: "active",
    gameArea: squareGameArea,
    memberRoles: { "host-1": "observer" },
    ...overrides,
  } as SessionRecord;
}

const timer = {
  timerState: { accumulatedMs: 0, runningSince: null },
  running: false,
  hasStarted: false,
} as never;

const overlay = {
  isChatOpen: false,
  isLogOpen: false,
  isCodesOpen: false,
  closeSheet: vi.fn(),
  openChat: vi.fn(),
  openLog: vi.fn(),
  openCodes: vi.fn(),
} as never;

describe("ObserverMapScreenChrome", () => {
  it("mounts Castle Siege setup chrome for castleSiege host observers", () => {
    renderWithAppUi(
      <ObserverMapScreenChrome
        session={baseSession({
          mode: "castleSiege",
          setupMode: "pregame",
          castleSiegeRoles: { "host-1": "teamA" },
        })}
        myRole="observer"
        myUid="host-1"
        isHost
        timer={timer}
        overlay={overlay}
        onLeave={() => undefined}
      />,
    );

    expect(screen.getByTestId("castle-siege-setup-chrome")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /import arena from game area/i }),
    ).toBeInTheDocument();
  });

  it("does not mount Castle Siege setup chrome for classic observer sessions", () => {
    renderWithAppUi(
      <ObserverMapScreenChrome
        session={baseSession({ mode: "classic" })}
        myRole="observer"
        myUid="host-1"
        isHost
        timer={timer}
        overlay={overlay}
        onLeave={() => undefined}
      />,
    );

    expect(screen.queryByTestId("castle-siege-setup-chrome")).not.toBeInTheDocument();
  });
});
