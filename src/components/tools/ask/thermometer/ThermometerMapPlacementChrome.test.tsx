import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { expectBusyPrimary, expectUnavailablePrimary } from "../primaryActionContract.testAssert";
import { ThermometerMapPlacementChrome } from "./ThermometerMapPlacementChrome";

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
  overrides: Partial<Parameters<typeof ThermometerMapPlacementChrome>[0]> = {},
) {
  const onCommit = overrides.onCommit ?? vi.fn();
  render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <ThermometerMapPlacementChrome
        distanceLabel="500 m"
        questionPrompt="Hotter or colder?"
        pinStep="ready"
        placementMode="manual"
        onPlacementModeChange={vi.fn()}
        onStartWalk={vi.fn()}
        awaitHiderAnswer
        canCommit={false}
        onCommit={onCommit}
        {...overrides}
      />
    </MantineProvider>,
  );
  return { onCommit };
}

describe("ThermometerMapPlacementChrome", () => {
  it("marks Send unavailable when !canCommit", () => {
    const { onCommit } = renderChrome({ canCommit: false });
    expectUnavailablePrimary(screen.getByRole("button", { name: /^Send to hiders$/i }), onCommit);
  });

  it("keeps Send busy without native disable while submitting", () => {
    const { onCommit } = renderChrome({ canCommit: true, isSubmitting: true });
    expectBusyPrimary(screen.getByRole("button", { name: "Sending…" }), onCommit);
  });
});
