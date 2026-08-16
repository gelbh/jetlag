import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AskCostChip } from "./AskCostChip";
import { setPlayerUxWorldFlagForTests } from "@/services/core/analytics/playerUxWorldFlag";

vi.mock("posthog-js", () => ({
  default: {
    isFeatureEnabled: () => undefined,
    onFeatureFlags: () => () => {},
  },
}));

describe("AskCostChip", () => {
  beforeEach(() => {
    setPlayerUxWorldFlagForTests(null);
  });

  it("uses Broadcast uppercase when flag is off", () => {
    setPlayerUxWorldFlagForTests(false);
    render(<AskCostChip toolLabel="Radar" costLabel="D2P1" />);
    expect(screen.getByTestId("ask-cost-chip")).toHaveTextContent("RADAR · D2P1");
  });

  it("uses plain Survey labels when flag is on", () => {
    setPlayerUxWorldFlagForTests(true);
    render(<AskCostChip toolLabel="Radar" costLabel="D2P1" />);
    const chip = screen.getByTestId("ask-cost-chip");
    expect(chip).toHaveTextContent("Radar · D2P1");
    expect(chip).toHaveAttribute("data-survey", "true");
  });
});
