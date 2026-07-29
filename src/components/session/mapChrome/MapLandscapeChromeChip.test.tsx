import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MapLandscapeChromeChip } from "./MapLandscapeChromeChip";

describe("MapLandscapeChromeChip", () => {
  it("shows timer and unhealthy sync text in the chip", () => {
    render(
      <MapLandscapeChromeChip
        collapsed
        onToggle={() => undefined}
        sessionRules={{ gameSize: "medium" }}
        timerState={{ runningSince: Date.now() - 60_000, accumulatedMs: 0 }}
        timerHasStarted
        syncStatus="offline"
        queuedWrites={2}
      />,
    );

    expect(screen.getByText("HIDE")).toBeInTheDocument();
    expect(screen.getByText(/Offline/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Show map controls/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("omits sync copy when status is healthy", () => {
    render(
      <MapLandscapeChromeChip
        collapsed={false}
        onToggle={() => undefined}
        sessionRules={{ gameSize: "medium" }}
        timerState={{ runningSince: Date.now() - 60_000, accumulatedMs: 0 }}
        timerHasStarted
        syncStatus="synced"
        queuedWrites={0}
      />,
    );

    expect(screen.queryByText(/Offline/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hide map controls" }),
    ).toHaveAttribute("aria-expanded", "true");
  });
});
