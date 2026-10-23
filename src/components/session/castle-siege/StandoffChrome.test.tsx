import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createInitialStandoffTurn } from "@/domain/session/castleSiege/standoffTurn";
import { StandoffChrome } from "./StandoffChrome";

describe("StandoffChrome", () => {
  it("renders nothing when inactive (classic)", () => {
    const { container } = render(
      <StandoffChrome active={false} turn={null} deckRemaining={36} handCount={0} handLimit={5} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders turn mast, deck, and hand when active", () => {
    render(
      <StandoffChrome
        active
        turn={createInitialStandoffTurn(Date.now())}
        deckRemaining={30}
        handCount={2}
        handLimit={5}
        endgameBanner="lastWord"
      />,
    );
    expect(screen.getByTestId("castle-siege-standoff-chrome")).toBeInTheDocument();
    expect(screen.getByTestId("castle-siege-turn-mast")).toHaveTextContent(/Team A/);
    expect(screen.getByTestId("castle-siege-deck-well")).toHaveTextContent("Deck 30");
    expect(screen.getByTestId("castle-siege-hand-rail")).toHaveTextContent("Hand 2/5");
    expect(screen.getByTestId("castle-siege-endgame-banner")).toHaveTextContent("Last Word");
    expect(screen.queryByTestId("castle-siege-declare-stake")).not.toBeInTheDocument();
  });
});
