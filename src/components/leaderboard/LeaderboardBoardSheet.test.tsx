import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LeaderboardBoardSelection } from "../../domain/game/leaderboardBoardPrefs";
import { LeaderboardBoardSheet } from "./LeaderboardBoardSheet";

const selection: LeaderboardBoardSelection = {
  scope: "global",
  gameSize: "medium",
  role: "seeker",
  metric: "distance_traveled",
};

describe("LeaderboardBoardSheet", () => {
  it("calls onChange when a metric option is selected", () => {
    const onChange = vi.fn();
    render(
      <LeaderboardBoardSheet
        open
        onClose={vi.fn()}
        selection={selection}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Choose board" })).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Wins" }));

    expect(onChange).toHaveBeenCalledWith({
      ...selection,
      metric: "wins",
    });
  });
});
