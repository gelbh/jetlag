import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapLandscapeChromeChip } from "./MapLandscapeChromeChip";
import { jetlagMantineTheme } from "@/theme/mantineTheme";

const chipProps = {
  collapsed: true as const,
  onToggle: () => undefined,
  sessionRules: { gameSize: "medium" as const },
  timerState: { runningSince: Date.now() - 60_000, accumulatedMs: 0 },
  timerHasStarted: true,
  syncStatus: "offline" as const,
  queuedWrites: 2,
};

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

function renderChip(props: typeof chipProps = chipProps) {
  return render(
    <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
      <MapLandscapeChromeChip {...props} />
    </MantineProvider>,
  );
}

describe("MapLandscapeChromeChip", () => {
  it("shows timer and unhealthy sync text in the chip", () => {
    renderChip();

    expect(screen.getByText("HIDE")).toBeInTheDocument();
    expect(screen.getByText(/Offline/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Show map controls/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("omits sync copy when status is healthy", () => {
    renderChip({
      ...chipProps,
      collapsed: false,
      syncStatus: "synced",
      queuedWrites: 0,
    });

    expect(screen.queryByText(/Offline/)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hide map controls" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("mounts Mantine chip", () => {
    const { container } = renderChip();
    expect(
      container.querySelector('[data-testid="map-landscape-chrome-chip-mantine"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-player-ux-world="mantine"]'),
    ).not.toBeNull();
    expect(screen.getByText("HIDE")).toBeInTheDocument();
  });
});
