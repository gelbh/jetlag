import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { DistanceUnit } from "../../domain/map/distance";
import type { SessionRulesInput } from "../../domain/session/rules";
import { ThermometerPanel } from "./ThermometerPanel";

const sessionRules = {
  gameSize: "medium",
  edition: "hide-seek",
} as SessionRulesInput;

const baseProps = {
  distanceUnit: "imperial" as DistanceUnit,
  sessionRules,
  distanceMeters: 804.672,
  travelMeters: 1200,
  answer: null,
  step: "ready" as const,
  presetUseCount: 0,
  costLabel: "D2P1",
  placementMode: "manual" as const,
  walkingActive: false,
  onPlacementModeChange: vi.fn(),
  onDistanceChange: vi.fn(),
  onAnswerChange: vi.fn(),
  onReset: vi.fn(),
  onStartWalk: vi.fn(),
  onCommit: vi.fn(),
};

describe("ThermometerPanel place→configure→ask commit chrome", () => {
  it("enables Continue on Place once manual pins are ready", () => {
    render(<ThermometerPanel {...baseProps} />);

    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("exposes exactly one enabled Add thermometer control on ask", () => {
    render(<ThermometerPanel {...baseProps} answer="hotter" />);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    const commit = screen.getAllByRole("button", { name: "Add thermometer" });
    expect(commit).toHaveLength(1);
    expect(commit[0]).toBeEnabled();
  });

  it("exposes exactly one enabled Send to hiders control in multiplayer ask", () => {
    render(
      <ThermometerPanel
        {...baseProps}
        awaitHiderAnswer
        costLabel="D2P1"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    const send = screen.getAllByRole("button", {
      name: "Send to hiders (D2P1)",
    });
    expect(send).toHaveLength(1);
    expect(send[0]).toBeEnabled();
  });
});
