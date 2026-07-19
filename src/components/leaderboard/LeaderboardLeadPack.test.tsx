import { createRef } from "react";
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
    expect(screen.getByRole("list", { name: "Top ranks" })).toBeTruthy();
  });

  it("shows named status skeleton while loading", () => {
    render(
      <LeaderboardLeadPack entries={[]} metric="wins" loading />,
    );
    expect(
      screen.getByRole("status", { name: "Loading top ranks" }),
    ).toHaveAttribute("aria-busy", "true");
  });

  it("marks the viewer row, attaches viewerRowRef, and shows YOU", () => {
    const viewerRowRef = createRef<HTMLLIElement | null>();
    render(
      <LeaderboardLeadPack
        entries={[entry("a", 1), entry("viewer", 2)]}
        metric="wins"
        viewerUid="viewer"
        viewerRowRef={viewerRowRef}
      />,
    );

    const viewerRow = screen.getByTestId("leaderboard-row-viewer");
    expect(viewerRowRef.current).toBe(viewerRow);
    expect(screen.getByText("YOU")).toBeTruthy();
  });
});
