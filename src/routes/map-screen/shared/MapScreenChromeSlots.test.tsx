import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MapScreenChromeSlots } from "./MapScreenChromeSlots";

vi.mock("../../../hooks/useDesktopLayout", () => ({
  useDesktopLayout: () => false,
}));

vi.mock("../../../components/map/DesktopOpsShell", () => ({
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

describe("MapScreenChromeSlots", () => {
  it("renders header and toolbar in the mobile HUD shell", () => {
    render(
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

  it("passes fragments without the HUD wrapper when layout is fragments", () => {
    render(
      <MapScreenChromeSlots
        layout="fragments"
        header={<div>Fragment header</div>}
        toolbar={<div>Fragment toolbar</div>}
      />,
    );

    expect(screen.getByText("Fragment header")).toBeInTheDocument();
    expect(screen.getByText("Fragment toolbar")).toBeInTheDocument();
    expect(document.querySelector(".map-chrome-hud")).toBeNull();
  });
});
