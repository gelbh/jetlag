import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { expectBusyPrimary, expectUnavailablePrimary } from "../primaryActionContract.testAssert";
import { RadarMapPlacementChrome } from "./RadarMapPlacementChrome";

beforeEach(() => {
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

function renderChrome(
  overrides: Partial<Omit<Parameters<typeof RadarMapPlacementChrome>[0], "onCommit">> = {},
) {
  const onCommit = vi.fn();
  render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <RadarMapPlacementChrome
        distanceLabel="1 km"
        questionPrompt="Is the hider inside the circle?"
        phase="answer"
        onUseGps={vi.fn()}
        awaitHiderAnswer
        radiusMeters={1000}
        chooseCustom={false}
        customRadius=""
        distanceUnit="metric"
        gameSize="medium"
        usedDistanceOptions={new Set()}
        onPresetSelect={vi.fn()}
        onChooseSelect={vi.fn()}
        onCustomRadiusChange={vi.fn()}
        canCommit={false}
        {...overrides}
        onCommit={onCommit}
      />
    </MantineProvider>,
  );
  return { onCommit };
}

describe("RadarMapPlacementChrome", () => {
  it("marks Send unavailable when !canCommit", () => {
    const { onCommit } = renderChrome({ canCommit: false });
    expectUnavailablePrimary(screen.getByRole("button", { name: /^Send to hiders$/i }), onCommit);
  });

  it("keeps Send busy without native disable while submitting", () => {
    const { onCommit } = renderChrome({ canCommit: true, isSubmitting: true });
    expectBusyPrimary(screen.getByRole("button", { name: "Sending…" }), onCommit);
  });
});
