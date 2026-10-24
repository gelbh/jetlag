import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionRecord } from "@/domain/map/annotations";
import { DEFAULT_CASTLE_SIEGE_DIALS } from "@/domain/session/castleSiege/dials";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { CastleSiegeSetupChrome } from "./CastleSiegeSetupChrome";

const updateCastleSiegeSetup = vi.fn(async (..._args: unknown[]) => undefined);
const writeTeamSealHash = vi.fn(async (..._args: unknown[]) => undefined);

vi.mock("@/services/firestore/firestoreSessions", () => ({
  updateCastleSiegeSetup: (...args: unknown[]) => updateCastleSiegeSetup(...args),
  writeTeamSealHash: (...args: unknown[]) => writeTeamSealHash(...args),
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
    code: "ABCD",
    hostUid: "host-1",
    createdAt: "2026-10-20T00:00:00.000Z",
    status: "active",
    gameArea: squareGameArea,
    ...overrides,
  } as SessionRecord;
}

describe("CastleSiegeSetupChrome", () => {
  beforeEach(() => {
    updateCastleSiegeSetup.mockClear();
    writeTeamSealHash.mockClear();
  });

  it("renders nothing for classic sessions", () => {
    renderWithAppUi(
      <CastleSiegeSetupChrome session={baseSession({ mode: "classic" })} uid="host-1" isHost />,
    );
    expect(screen.queryByTestId("castle-siege-setup-chrome")).not.toBeInTheDocument();
  });

  it("renders nothing when mode is absent", () => {
    renderWithAppUi(<CastleSiegeSetupChrome session={baseSession()} uid="host-1" isHost />);
    expect(screen.queryByTestId("castle-siege-setup-chrome")).not.toBeInTheDocument();
  });

  it("shows Skin-S3 setup chrome for castleSiege sessions", () => {
    renderWithAppUi(
      <CastleSiegeSetupChrome
        session={baseSession({
          mode: "castleSiege",
          setupMode: "pregame",
          dials: DEFAULT_CASTLE_SIEGE_DIALS,
          castleSiegeRoles: { "host-1": "teamA" },
        })}
        uid="host-1"
        isHost
      />,
    );

    expect(screen.getByTestId("castle-siege-setup-chrome")).toBeInTheDocument();
    expect(screen.getByTestId("castle-siege-arena-ledger")).toBeInTheDocument();
    expect(screen.getByTestId("castle-siege-muster-dials")).toBeInTheDocument();
    expect(screen.getByTestId("castle-siege-seal-vault")).toBeInTheDocument();
    expect(screen.getByText("Pregame")).toBeInTheDocument();
    expect(screen.queryByTestId("castle-siege-fair-split-proposal")).not.toBeInTheDocument();
  });

  it("gates Fair-split propose until both seal coordinates exist", () => {
    renderWithAppUi(
      <CastleSiegeSetupChrome
        session={baseSession({
          mode: "castleSiege",
          setupMode: "fairSplit",
          dials: DEFAULT_CASTLE_SIEGE_DIALS,
          castleSiegeRoles: { "host-1": "teamA" },
        })}
        uid="host-1"
        isHost
      />,
    );

    expect(screen.getByTestId("castle-siege-fair-split-awaiting-seals")).toBeInTheDocument();
    expect(screen.getByText("Fair-split")).toBeInTheDocument();
    expect(screen.queryByTestId("castle-siege-fair-split-proposal")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Propose fair split" })).not.toBeInTheDocument();
  });

  it("mounts Fair-split proposal chrome when both seals are provided", () => {
    renderWithAppUi(
      <CastleSiegeSetupChrome
        session={baseSession({
          mode: "castleSiege",
          setupMode: "fairSplit",
          dials: DEFAULT_CASTLE_SIEGE_DIALS,
          castleSiegeRoles: { "host-1": "teamA" },
        })}
        uid="host-1"
        isHost
        sealA={{ lat: 0.05, lng: 0.05 }}
        sealB={{ lat: 0.15, lng: 0.15 }}
      />,
    );

    expect(screen.getByTestId("castle-siege-fair-split-proposal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Propose fair split" })).toBeInTheDocument();
    expect(screen.queryByTestId("castle-siege-fair-split-awaiting-seals")).not.toBeInTheDocument();
  });

  it("imports arena from gameArea for the host", async () => {
    renderWithAppUi(
      <CastleSiegeSetupChrome
        session={baseSession({
          mode: "castleSiege",
          setupMode: "pregame",
          castleSiegeRoles: { "host-1": "teamA" },
        })}
        uid="host-1"
        isHost
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Import arena from game area" }));

    await waitFor(() => {
      expect(updateCastleSiegeSetup).toHaveBeenCalledWith(
        "session-1",
        expect.objectContaining({
          arena: expect.objectContaining({ source: "gameArea" }),
        }),
      );
    });
  });

  it("commits a seal hash from name and secret", async () => {
    renderWithAppUi(
      <CastleSiegeSetupChrome
        session={baseSession({
          mode: "castleSiege",
          setupMode: "pregame",
          castleSiegeRoles: { "player-2": "teamB" },
        })}
        uid="player-2"
        isHost={false}
      />,
    );

    fireEvent.change(screen.getByLabelText("Anchor name"), {
      target: { value: "North Keep" },
    });
    fireEvent.change(screen.getByLabelText("Secret phrase"), {
      target: { value: "open-sesame" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Commit seal" }));

    await waitFor(() => {
      expect(writeTeamSealHash).toHaveBeenCalledWith(
        "session-1",
        expect.objectContaining({
          teamId: "teamB",
          sealedByUid: "player-2",
          hash: expect.stringMatching(/^[0-9a-f]{64}$/),
        }),
      );
    });
  });
});
