import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { expectBusyPrimary, expectUnavailablePrimary } from "../primaryActionContract.testAssert";
import { PhotoMapPlacementChrome } from "./PhotoMapPlacementChrome";

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

describe("PhotoMapPlacementChrome", () => {
  it("marks Send unavailable when !canCommit", () => {
    const onCommit = vi.fn();
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <PhotoMapPlacementChrome
          categoryLabel="Landmark"
          questionPrompt="Send a photo"
          canCommit={false}
          onCommit={onCommit}
        />
      </MantineProvider>,
    );

    expectUnavailablePrimary(screen.getByRole("button", { name: /^Send to hiders$/i }), onCommit);
  });

  it("keeps Send busy without native disable while submitting", () => {
    const onCommit = vi.fn();
    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <PhotoMapPlacementChrome
          categoryLabel="Landmark"
          questionPrompt="Send a photo"
          canCommit
          isSubmitting
          onCommit={onCommit}
        />
      </MantineProvider>,
    );

    expectBusyPrimary(screen.getByRole("button", { name: "Sending…" }), onCommit);
  });
});
