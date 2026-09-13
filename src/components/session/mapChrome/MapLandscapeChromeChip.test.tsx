import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapLandscapeChromeChip } from "./MapLandscapeChromeChip";
import { jetlagMantineTheme } from "@/theme/mantineTheme";

const { mockUsePlayerUiMantine } = vi.hoisted(() => ({
  mockUsePlayerUiMantine: vi.fn(() => false),
}));

vi.mock("@/hooks/feature/usePlayerUiMantine", () => ({
  usePlayerUiMantine: () => mockUsePlayerUiMantine(),
}));

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
  mockUsePlayerUiMantine.mockReturnValue(false);
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {},
    dispatchEvent: () => false,
  }));
});

describe("MapLandscapeChromeChip", () => {
  it("shows timer and unhealthy sync text in the chip", () => {
    render(<MapLandscapeChromeChip {...chipProps} />);

    expect(screen.getByText("HIDE")).toBeInTheDocument();
    expect(screen.getByText(/Offline/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Show map controls/i }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("omits sync copy when status is healthy", () => {
    render(
      <MapLandscapeChromeChip
        {...chipProps}
        collapsed={false}
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

describe("MapLandscapeChromeChip Mantine gate", () => {
  it("keeps Legacy chip when flag is off", () => {
    const { container } = render(<MapLandscapeChromeChip {...chipProps} />);
    expect(container.querySelector(".jl-landscape-chrome-chip")).not.toBeNull();
    expect(
      container.querySelector('[data-testid="map-landscape-chrome-chip-mantine"]'),
    ).toBeNull();
  });

  it("mounts Mantine chip when flag is on", () => {
    mockUsePlayerUiMantine.mockReturnValue(true);
    const { container } = render(
      <MantineProvider theme={jetlagMantineTheme} forceColorScheme="dark">
        <MapLandscapeChromeChip {...chipProps} />
      </MantineProvider>,
    );
    expect(
      container.querySelector('[data-testid="map-landscape-chrome-chip-mantine"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-player-ux-world="mantine"]'),
    ).not.toBeNull();
    expect(screen.getByText("HIDE")).toBeInTheDocument();
  });
});
