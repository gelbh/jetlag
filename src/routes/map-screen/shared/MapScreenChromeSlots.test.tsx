import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MapLandscapeChromeProvider } from "@/components/session/mapChrome/MapLandscapeChromeContext";
import { MapScreenChromeSlots } from "./MapScreenChromeSlots";

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
    expect(document.querySelector("[data-testid='desktop-ops-shell']")).toBeNull();
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
});
