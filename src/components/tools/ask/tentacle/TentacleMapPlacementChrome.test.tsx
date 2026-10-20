import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { expectBusyPrimary, expectUnavailablePrimary } from "../primaryActionContract.testAssert";
import { TentacleMapPlacementChrome } from "./TentacleMapPlacementChrome";

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
  overrides: Partial<Omit<Parameters<typeof TentacleMapPlacementChrome>[0], "onCommit">> = {},
) {
  const onCommit = vi.fn();
  render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <TentacleMapPlacementChrome
        categoryLabel="Metro line"
        questionPrompt="Which line?"
        phase="answer"
        onUseGps={vi.fn()}
        awaitHiderAnswer
        categoryId="metro_line"
        distanceUnit="metric"
        searchRadiusMeters={500}
        poiOptions={[]}
        selectedPoiId={null}
        outOfReach={false}
        onOutOfReachChange={vi.fn()}
        statusTitle="Ready"
        statusBody="Place set"
        canCommit={false}
        {...overrides}
        onCommit={onCommit}
      />
    </MantineProvider>,
  );
  return { onCommit };
}

describe("TentacleMapPlacementChrome", () => {
  it("marks Send unavailable when !canCommit", () => {
    const { onCommit } = renderChrome({ canCommit: false });
    expectUnavailablePrimary(screen.getByRole("button", { name: /^Send to hiders$/i }), onCommit);
  });

  it("keeps Send busy without native disable while submitting", () => {
    const { onCommit } = renderChrome({ canCommit: true, isSubmitting: true });
    expectBusyPrimary(screen.getByRole("button", { name: "Sending…" }), onCommit);
  });
});
