import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HiderHandSheet } from "./HiderHandSheet";
import { createInitialBoardEconomyState } from "../../../domain/boardEconomy";

describe("HiderHandSheet", () => {
  it("shows hand counts and hides when closed", () => {
    const state = createInitialBoardEconomyState("test");
    const withHand = {
      ...state,
      hand: state.deck.slice(0, 2),
      deck: state.deck.slice(2),
    };
    const { rerender } = render(
      <HiderHandSheet
        open={false}
        onClose={() => {}}
        state={withHand}
        gameSize="medium"
        mustDiscard={0}
        onDiscard={vi.fn()}
        onPlayExpand={vi.fn()}
        onPlayCurse={vi.fn()}
        onClearCurse={vi.fn()}
        onPlayMove={vi.fn()}
      />,
    );
    expect(screen.queryByLabelText("Hider hand")).toBeNull();

    rerender(
      <HiderHandSheet
        open
        onClose={() => {}}
        state={withHand}
        gameSize="medium"
        mustDiscard={0}
        onDiscard={vi.fn()}
        onPlayExpand={vi.fn()}
        onPlayCurse={vi.fn()}
        onClearCurse={vi.fn()}
        onPlayMove={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Hider hand")).toBeTruthy();
    expect(screen.getByText(/2 \/ 6 cards/)).toBeTruthy();
  });
});
