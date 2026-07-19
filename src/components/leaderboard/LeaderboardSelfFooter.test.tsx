import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LeaderboardSelfFooter } from "./LeaderboardSelfFooter";

const entry = {
  uid: "me",
  displayName: "Nova",
  value: 12,
  rank: 5,
};

describe("LeaderboardSelfFooter", () => {
  it("renders nothing when hidden", () => {
    const { container } = render(
      <LeaderboardSelfFooter mode="hidden" entry={entry} metric="wins" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows pinned rank and jumps on click", () => {
    const onJump = vi.fn();
    render(
      <LeaderboardSelfFooter
        mode="pinned"
        entry={entry}
        metric="wins"
        onJump={onJump}
      />,
    );
    expect(screen.getByTestId("leaderboard-self-footer")).toHaveTextContent(
      /#5 · YOU · 12/,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onJump).toHaveBeenCalled();
  });

  it("shows off_list copy", () => {
    render(
      <LeaderboardSelfFooter
        mode="off_list"
        entry={{ ...entry, rank: 80 }}
        metric="wins"
      />,
    );
    expect(screen.getByTestId("leaderboard-self-footer")).toHaveTextContent(
      /#80 · YOU · 12/,
    );
  });

  it("shows unranked copy", () => {
    render(
      <LeaderboardSelfFooter mode="unranked" entry={null} metric="wins" />,
    );
    expect(screen.getByTestId("leaderboard-self-footer")).toHaveTextContent(
      "Not ranked on this board",
    );
  });

  it("shows error copy", () => {
    render(
      <LeaderboardSelfFooter mode="error" entry={null} metric="wins" />,
    );
    expect(screen.getByTestId("leaderboard-self-footer")).toHaveTextContent(
      "Couldn't load your rank",
    );
  });
});
