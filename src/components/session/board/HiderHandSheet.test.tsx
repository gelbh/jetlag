import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createInitialBoardEconomyState } from "../../../domain/boardEconomy";
import { renderWithAppUi } from "../../../test/renderWithAppUi";
import { HiderHandSheet } from "./HiderHandSheet";

const noopHandlers = {
  onPlayExpand: vi.fn(),
  onPlayDiscardDraw: vi.fn(),
  onPlayCurse: vi.fn(),
  onClearCurse: vi.fn(),
  onPlayMove: vi.fn(),
};

describe("HiderHandSheet", () => {
  it("keeps host mounted and gates content on open", async () => {
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
    // Closed: no dialog role / body (Drawer keepMounted=false). Host stays in React tree.
    expect(screen.queryByRole("dialog", { name: "Hider hand" })).not.toBeInTheDocument();
    expect(screen.queryByText(/2 \/ 6 cards/)).not.toBeInTheDocument();

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
    // Present latch: first paint opened=false, then effect opens.
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Hider hand" })).toBeTruthy();
    });
    expect(screen.getByText(/2 \/ 6 cards/)).toBeTruthy();
  });

  it("exposes discard when over hand limit", async () => {
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
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Hider hand" })).toBeTruthy();
    });
    const discardButtons = screen.getAllByRole("button", { name: "Discard" });
    expect(discardButtons.length).toBeGreaterThan(0);
    fireEvent.click(discardButtons[0]!);
    expect(onDiscard).toHaveBeenCalled();
  });
});
