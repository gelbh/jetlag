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

  it("calls onChange when game size changes", () => {
    const onChange = vi.fn();
    render(
      <LeaderboardBoardSheet
        open
        onClose={vi.fn()}
        selection={selection}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Large" }));

    expect(onChange).toHaveBeenCalledWith({
      ...selection,
      gameSize: "large",
    });
  });

  it("calls onChange when role changes", () => {
    const onChange = vi.fn();
    render(
      <LeaderboardBoardSheet
        open
        onClose={vi.fn()}
        selection={selection}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Hider" }));

    expect(onChange).toHaveBeenCalledWith({
      ...selection,
      role: "hider",
    });
  });

  it("updates metric labels when role selection changes", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <LeaderboardBoardSheet
        open
        onClose={vi.fn()}
        selection={selection}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("tab", { name: "Questions asked" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Seek time" })).toBeTruthy();

    rerender(
      <LeaderboardBoardSheet
        open
        onClose={vi.fn()}
        selection={{ ...selection, role: "hider" }}
        onChange={onChange}
      />,
    );

    expect(
      screen.getByRole("tab", { name: "Questions received" }),
    ).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Hiding time" })).toBeTruthy();
    expect(screen.queryByRole("tab", { name: "Questions asked" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Seek time" })).toBeNull();
  });
});
