import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DistanceUnit } from "../../domain/map/distance";
import type { RadarDistanceOptionKey } from "../../domain/questions";
import type { GameSize } from "../../domain/session/size/gameSize";
import { renderWithAppUi } from "../../test/renderWithAppUi";
import { RadarPanel } from "./RadarPanel";

const baseProps = {
  radiusMeters: 1609,
  chooseCustom: false,
  customRadius: "",
  awaitingPlacement: false,
  hasCenter: true,
  distanceUnit: "imperial" as DistanceUnit,
  gameSize: "medium" as GameSize,
  usedDistanceOptions: new Set<RadarDistanceOptionKey>(),
  onPresetSelect: vi.fn(),
  onChooseSelect: vi.fn(),
  onCustomRadiusChange: vi.fn(),
  onAnswerChange: vi.fn(),
  onUseGps: vi.fn(),
  onPlaceAtMapTap: vi.fn(),
  onCommit: vi.fn(),
  gpsLoading: false,
};

function advanceToAskPhase() {
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
}

describe("RadarPanel ask-phase commit chrome", () => {
  it("exposes exactly one Add radar question control", () => {
    renderWithAppUi(<RadarPanel {...baseProps} answer="yes" />);

    advanceToAskPhase();

    expect(screen.getAllByRole("button", { name: "Add radar question" })).toHaveLength(1);
  });

  it("exposes exactly one Send to hiders control in multiplayer ask", () => {
    renderWithAppUi(<RadarPanel {...baseProps} answer={null} awaitHiderAnswer costLabel="D2P1" />);

    advanceToAskPhase();

    expect(screen.getAllByRole("button", { name: "Send to hiders (D2P1)" })).toHaveLength(1);
  });
});
