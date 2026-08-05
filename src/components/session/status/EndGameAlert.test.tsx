import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EndGameAlert } from "./EndGameAlert";

describe("EndGameAlert", () => {
  it("is hidden when end game is inactive", () => {
    const { container } = render(
      <EndGameAlert endGameActive={false} isHost playerRole="seeker" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows banner only for a host-hider (no End end game)", () => {
    render(
      <EndGameAlert
        endGameActive
        isHost
        playerRole="hider"
        onResetEndGame={vi.fn()}
      />,
    );

    expect(screen.getByText("End game started")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "End end game" }),
    ).not.toBeInTheDocument();
  });

  it("shows End end game for a host-seeker", () => {
    const onResetEndGame = vi.fn();

    render(
      <EndGameAlert
        endGameActive
        isHost
        playerRole="seeker"
        onResetEndGame={onResetEndGame}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "End end game" }));
    expect(onResetEndGame).toHaveBeenCalledTimes(1);
  });

  it("shows banner only for a non-host seeker", () => {
    render(
      <EndGameAlert
        endGameActive
        isHost={false}
        playerRole="seeker"
        onResetEndGame={vi.fn()}
      />,
    );

    expect(screen.getByText("End game started")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "End end game" }),
    ).not.toBeInTheDocument();
  });
});
