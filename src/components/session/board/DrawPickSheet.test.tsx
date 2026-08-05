import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DrawPickSheet } from "./DrawPickSheet";
import {
  beginSequentialRewardPick,
  createInitialBoardEconomyState,
} from "../../../domain/boardEconomy";

describe("DrawPickSheet", () => {
  it("requires keep count and records keep/discard selection", () => {
    const started = beginSequentialRewardPick(
      createInitialBoardEconomyState("draw-ui"),
      [{ draw: 3, keep: 1 }],
    );
    expect(started.pendingPick).not.toBeNull();
    const onConfirm = vi.fn();
    render(
      <DrawPickSheet
        pending={started.pendingPick}
        gameSize="medium"
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByLabelText("Choose cards to keep")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Confirm keep/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/exactly 1/i);
    expect(onConfirm).not.toHaveBeenCalled();

    const options = screen.getAllByRole("button", { pressed: false });
    fireEvent.click(options[0]!);
    fireEvent.click(screen.getByRole("button", { name: /Confirm keep/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0]![0]).toEqual([
      started.pendingPick!.drawn[0]!.instanceId,
    ]);
  });
});
