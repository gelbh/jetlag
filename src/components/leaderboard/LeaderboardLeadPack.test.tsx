import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LeaderboardEntry } from "../../domain/game/leaderboard";
import { LeaderboardLeadPack } from "./LeaderboardLeadPack";

const entry = (
  uid: string,
  rank: number,
  value = 10,
): LeaderboardEntry => ({
  uid,
  displayName: uid,
  value,
  rank,
});

describe("LeaderboardLeadPack", () => {
  it("renders nothing for empty entries", () => {
    const { container } = render(
      <LeaderboardLeadPack entries={[]} metric="wins" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders only provided rows without fillers", () => {
    render(
      <LeaderboardLeadPack
        entries={[entry("a", 1), entry("b", 2)]}
        metric="wins"
      />,
    );
    expect(screen.getByTestId("leaderboard-row-a")).toBeTruthy();
    expect(screen.getByTestId("leaderboard-row-b")).toBeTruthy();
    expect(screen.queryByTestId("leaderboard-row-c")).toBeNull();
  });

  it("shows busy skeleton while loading", () => {
    render(
      <LeaderboardLeadPack entries={[]} metric="wins" loading />,
    );
    expect(screen.getByLabelText("Loading top ranks")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  });
});
