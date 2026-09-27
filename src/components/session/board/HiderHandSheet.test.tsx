import { fireEvent, screen } from "@testing-library/react";
import { renderWithAppUi } from "../../../test/renderWithAppUi";
import { describe, expect, it, vi } from "vitest";
import { HiderHandSheet } from "./HiderHandSheet";
import { createInitialBoardEconomyState } from "../../../domain/boardEconomy";

const noopHandlers = {
  onPlayExpand: vi.fn(),
  onPlayDiscardDraw: vi.fn(),
  onPlayCurse: vi.fn(),
  onClearCurse: vi.fn(),
  onPlayMove: vi.fn(),
};

describe("HiderHandSheet", () => {
  it("shows hand counts and hides when closed", () => {
    const state = createInitialBoardEconomyState("test");
    const withHand = {
      ...state,
      hand: state.deck.slice(0, 2),
      deck: state.deck.slice(2),
    };
    const { rerender } = renderWithAppUi(
      <HiderHandSheet
        open={false}
        onClose={() => {}}
        state={withHand}
        gameSize="medium"
        mustDiscard={0}
        onDiscard={vi.fn()}
        {...noopHandlers}
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
        {...noopHandlers}
      />,
    );
    expect(screen.getAllByLabelText("Hider hand")[0]).toBeTruthy();
    expect(screen.getByText(/2 \/ 6 cards/)).toBeTruthy();
  });

  it("exposes discard when over hand limit", () => {
    const state = createInitialBoardEconomyState("over");
    const withHand = {
      ...state,
      hand: state.deck.slice(0, 7),
      deck: state.deck.slice(7),
    };
    const onDiscard = vi.fn();
    renderWithAppUi(
      <HiderHandSheet
        open
        onClose={() => {}}
        state={withHand}
        gameSize="medium"
        mustDiscard={1}
        onDiscard={onDiscard}
        {...noopHandlers}
      />,
    );
    const discardButtons = screen.getAllByRole("button", { name: "Discard" });
    expect(discardButtons.length).toBeGreaterThan(0);
    fireEvent.click(discardButtons[0]!);
    expect(onDiscard).toHaveBeenCalled();
  });
});
