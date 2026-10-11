import { MantineProvider } from "@mantine/core";
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { MapLandscapeChromeChip, type MapLandscapeChromeChipProps } from "./MapLandscapeChromeChip";

const clock = vi.hoisted(() => ({ now: 10_000 }));
vi.mock("@/services/core/time/serverClock", () => ({ serverNow: () => clock.now }));

const chipProps: MapLandscapeChromeChipProps = {
  collapsed: true,
  onToggle: () => undefined,
  sessionRules: { gameSize: "medium" },
  timerState: { runningSince: 10_000 - 60_000, accumulatedMs: 0 },
  timerHasStarted: true,
  syncStatus: "offline",
  queuedWrites: 2,
};

beforeEach(() => {
  clock.now = 10_000;
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

function renderChip(props: MapLandscapeChromeChipProps = chipProps) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <MapLandscapeChromeChip {...props} />
    </MantineProvider>,
  );
}

describe("MapLandscapeChromeChip", () => {
  it("shows timer and unhealthy sync text in the chip", () => {
    renderChip();

    expect(screen.getByText("HIDE")).toBeInTheDocument();
    expect(screen.getByText(/Offline/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Show map controls/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("omits sync copy when status is healthy", () => {
    renderChip({
      ...chipProps,
      collapsed: false,
      syncStatus: "synced",
      queuedWrites: 0,
    });

    expect(screen.queryByText(/Offline/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hide map controls" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("ticks a running timer from the server clock", () => {
    vi.useFakeTimers();
    try {
      renderChip({
        ...chipProps,
        timerState: { runningSince: 10_000, accumulatedMs: 4_000_000 },
      });
      expect(screen.getByText("SEEK")).toBeInTheDocument();
      expect(screen.getByText("06:40")).toBeInTheDocument();
      clock.now = 11_000;
      act(() => vi.advanceTimersByTime(1000));
      expect(screen.getByText("06:41")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("mounts Mantine chip", () => {
    const { container } = renderChip();
    expect(
      container.querySelector('[data-testid="map-landscape-chrome-chip-mantine"]'),
    ).not.toBeNull();
    expect(screen.getByText("HIDE")).toBeInTheDocument();
  });
});
