import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  beginSequentialRewardPick,
  createInitialBoardEconomyState,
} from "../../../domain/boardEconomy";
import { renderWithAppUi } from "../../../test/renderWithAppUi";
import { DrawPickSheet } from "./DrawPickSheet";

describe("DrawPickSheet", () => {
  it("keeps host mounted closed when pending is null", async () => {
    const { rerender } = renderWithAppUi(
      <DrawPickSheet pending={null} gameSize="medium" onConfirm={vi.fn()} />,
    );
    // Closed: no dialog / draw body. Host stays in React tree with open=false.
    expect(screen.queryByRole("dialog", { name: "Choose cards to keep" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Pick which drawn cards/i)).not.toBeInTheDocument();

    const started = beginSequentialRewardPick(createInitialBoardEconomyState("draw-ui"), [
      { draw: 3, keep: 1 },
    ]);
    rerender(<DrawPickSheet pending={started.pendingPick} gameSize="medium" onConfirm={vi.fn()} />);
    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Choose cards to keep" })).toBeInTheDocument();
    });
  });

  it("requires keep count and records keep/discard selection", async () => {
    const started = beginSequentialRewardPick(createInitialBoardEconomyState("draw-ui"), [
      { draw: 3, keep: 1 },
    ]);
    expect(started.pendingPick).not.toBeNull();
    const onConfirm = vi.fn();
    renderWithAppUi(
      <DrawPickSheet pending={started.pendingPick} gameSize="medium" onConfirm={onConfirm} />,
    );

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: "Choose cards to keep" })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /Confirm keep/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/exactly 1/i);
    expect(onConfirm).not.toHaveBeenCalled();

    const options = screen.getAllByRole("button", { pressed: false });
    fireEvent.click(options[0]!);
    fireEvent.click(screen.getByRole("button", { name: /Confirm keep/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0]![0]).toEqual([started.pendingPick!.drawn[0]!.instanceId]);
  });
});
