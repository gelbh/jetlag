import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GameArea } from "@/domain/map/annotations";
import { renderWithAppUi } from "@/test/renderWithAppUi";
import { FairSplitProposal } from "./FairSplitProposal";

const ARENA: GameArea = {
  type: "Polygon",
  coordinates: [
    [
      [-0.2, 51.4],
      [-0.1, 51.4],
      [-0.1, 51.5],
      [-0.2, 51.5],
      [-0.2, 51.4],
    ],
  ],
};

const SEAL_WEST = { lat: 51.45, lng: -0.18 };
const SEAL_EAST = { lat: 51.45, lng: -0.12 };

describe("FairSplitProposal", () => {
  const onLock = vi.fn(async () => undefined);

  beforeEach(() => {
    onLock.mockClear();
  });

  it("shows proposal chrome with propose action", () => {
    renderWithAppUi(
      <FairSplitProposal
        arena={ARENA}
        sealA={SEAL_WEST}
        sealB={SEAL_EAST}
        beltWidthMeters={100}
        isHost
        onLock={onLock}
      />,
    );

    expect(screen.getByTestId("castle-siege-fair-split-proposal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Propose fair split" })).toBeInTheDocument();
    expect(screen.getByText(/Awaiting proposal/i)).toBeInTheDocument();
  });

  it("hides host nudge and lock for non-hosts", () => {
    renderWithAppUi(
      <FairSplitProposal
        arena={ARENA}
        sealA={SEAL_WEST}
        sealB={SEAL_EAST}
        beltWidthMeters={100}
        isHost={false}
        onLock={onLock}
      />,
    );

    expect(screen.queryByRole("button", { name: "Nudge west" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lock border" })).not.toBeInTheDocument();
  });

  it("proposes a cut and shows score for the host", async () => {
    renderWithAppUi(
      <FairSplitProposal
        arena={ARENA}
        sealA={SEAL_WEST}
        sealB={SEAL_EAST}
        beltWidthMeters={100}
        isHost
        onLock={onLock}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Propose fair split" }));

    await waitFor(() => {
      expect(screen.getByText(/Proposal ready/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Score/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nudge west" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lock border" })).toBeInTheDocument();
  });

  it("forces manual path when no legal cut exists", async () => {
    renderWithAppUi(
      <FairSplitProposal
        arena={ARENA}
        sealA={SEAL_WEST}
        sealB={SEAL_EAST}
        beltWidthMeters={100}
        isHost
        candidates={[]}
        onLock={onLock}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Propose fair split" }));

    await waitFor(() => {
      expect(screen.getByTestId("castle-siege-fair-split-manual-path")).toBeInTheDocument();
    });
    expect(screen.getByTestId("castle-siege-fair-split-status")).toHaveTextContent(/No legal cut/i);
    expect(screen.queryByRole("button", { name: "Lock border" })).not.toBeInTheDocument();
  });

  it("locks a legal proposal via onLock", async () => {
    renderWithAppUi(
      <FairSplitProposal
        arena={ARENA}
        sealA={SEAL_WEST}
        sealB={SEAL_EAST}
        beltWidthMeters={100}
        isHost
        onLock={onLock}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Propose fair split" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Lock border" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Lock border" }));

    await waitFor(() => {
      expect(onLock).toHaveBeenCalledWith(
        expect.objectContaining({
          border: expect.objectContaining({ type: "LineString" }),
          neutralBelt: expect.anything(),
          coinAssignment: expect.objectContaining({
            teamA: expect.stringMatching(/left|right/),
            teamB: expect.stringMatching(/left|right/),
          }),
        }),
      );
    });
  });
});
