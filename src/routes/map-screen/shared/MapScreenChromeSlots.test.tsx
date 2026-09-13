import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapLandscapeChromeProvider } from "@/components/session/mapChrome/MapLandscapeChromeContext";
import { MapScreenChromeSlots } from "./MapScreenChromeSlots";

const { mockUsePlayerUiMantine } = vi.hoisted(() => ({
  mockUsePlayerUiMantine: vi.fn(() => false),
}));

vi.mock("@/hooks/feature/usePlayerUiMantine", () => ({
  usePlayerUiMantine: () => mockUsePlayerUiMantine(),
}));

vi.mock("../../../hooks/layout/useDesktopLayout", () => ({
  DESKTOP_LAYOUT_MIN_WIDTH_PX: 1024,
  useDesktopLayout: () => false,
}));

vi.mock("../../../components/map/chrome/DesktopOpsShell", () => ({
  DesktopOpsShell: ({
    status,
    tools,
    map,
  }: {
    status: React.ReactNode;
    tools: React.ReactNode;
    map: React.ReactNode;
  }) => (
    <div data-testid="desktop-ops-shell">
      <div data-testid="ops-status">{status}</div>
      <div data-testid="ops-tools">{tools}</div>
      <div data-testid="ops-map">{map}</div>
    </div>
  ),
}));

function renderWithLandscapeProvider(ui: React.ReactElement) {
  return render(
    <MapLandscapeChromeProvider
      sessionRules={{ gameSize: "medium" }}
      timerState={{ runningSince: null, accumulatedMs: 0 }}
      timerHasStarted={false}
      syncStatus="synced"
      queuedWrites={0}
    >
      {ui}
    </MapLandscapeChromeProvider>,
  );
}

beforeEach(() => {
  mockUsePlayerUiMantine.mockReturnValue(false);
});

describe("MapScreenChromeSlots", () => {
  it("renders header and toolbar in the mobile HUD shell", () => {
    renderWithLandscapeProvider(
      <MapScreenChromeSlots
        header={<div>Header slot</div>}
        toolbar={<div>Toolbar slot</div>}
      >
        <div>Sheet child</div>
      </MapScreenChromeSlots>,
    );

    expect(screen.getByText("Header slot")).toBeInTheDocument();
    expect(screen.getByText("Toolbar slot")).toBeInTheDocument();
    expect(screen.getByText("Sheet child")).toBeInTheDocument();
    expect(document.querySelector(".map-chrome-hud")).not.toBeNull();
  });

  it("passes fragments inside a HUD wrapper for landscape collapse hooks", () => {
    renderWithLandscapeProvider(
      <MapScreenChromeSlots
        layout="fragments"
        header={<div>Fragment header</div>}
        toolbar={<div>Fragment toolbar</div>}
      />,
    );

    expect(screen.getByText("Fragment header")).toBeInTheDocument();
    expect(screen.getByText("Fragment toolbar")).toBeInTheDocument();
    expect(document.querySelector(".map-chrome-hud--fragments")).not.toBeNull();
  });

  it("keeps survey player-ux world when Mantine flag is off", () => {
    renderWithLandscapeProvider(
      <MapScreenChromeSlots header={<div>Header</div>} />,
    );
    expect(
      document.querySelector('.map-chrome-hud[data-player-ux-world="survey"]'),
    ).not.toBeNull();
    expect(
      document.querySelector('.map-chrome-hud[data-player-ux-world="mantine"]'),
    ).toBeNull();
  });

  it("sets mantine player-ux world on HUD when flag is on", () => {
    mockUsePlayerUiMantine.mockReturnValue(true);
    renderWithLandscapeProvider(
      <MapScreenChromeSlots header={<div>Header</div>} />,
    );
    expect(
      document.querySelector('.map-chrome-hud[data-player-ux-world="mantine"]'),
    ).not.toBeNull();
  });
});
