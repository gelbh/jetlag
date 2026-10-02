import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithAppUi } from "../../../test/renderWithAppUi";
import { EndGameAlert } from "./EndGameAlert";

describe("EndGameAlert", () => {
  it("is hidden when end game is inactive", () => {
    renderWithAppUi(<EndGameAlert endGameActive={false} isHost playerRole="seeker" />);

    expect(screen.queryByText("End game started")).toBeNull();
  });

  it("shows banner only for a host-hider (no End end game)", () => {
    renderWithAppUi(
      <EndGameAlert endGameActive isHost playerRole="hider" onResetEndGame={vi.fn()} />,
    );

    expect(screen.getByText("End game started")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "End end game" })).not.toBeInTheDocument();
  });

  it("shows End end game for a host-seeker", () => {
    const onResetEndGame = vi.fn();

    const { container } = renderWithAppUi(
      <EndGameAlert endGameActive isHost playerRole="seeker" onResetEndGame={onResetEndGame} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "End end game" }));
    expect(onResetEndGame).toHaveBeenCalledTimes(1);
    expect(container.innerHTML).not.toMatch(/map-float-alert/);
    expect(container.innerHTML).not.toMatch(/btn-secondary/);
    const panel = screen.getByTestId("end-game-alert-panel");
    expect(panel.getAttribute("data-map-float-surface")).toBe("true");
    // Non-halt kit chrome (MapFloatAlertPanel would force halt error surface).
    expect(panel.className).not.toMatch(/mantine-Alert-root/);
  });

  it("shows banner only for a non-host seeker", () => {
    renderWithAppUi(
      <EndGameAlert endGameActive isHost={false} playerRole="seeker" onResetEndGame={vi.fn()} />,
    );

    expect(screen.getByText("End game started")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "End end game" })).not.toBeInTheDocument();
  });
});
