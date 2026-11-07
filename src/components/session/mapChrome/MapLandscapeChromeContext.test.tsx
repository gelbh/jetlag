import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LANDSCAPE_MAP_DOMINANT_MEDIA } from "@/hooks/layout/useLandscapeMapDominant";
import { jetlagTheme } from "@/theme/theme";
import { MapLandscapeChromeProvider, useMapLandscapeChrome } from "./MapLandscapeChromeContext";

function mockLandscapeMedia() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return query === LANDSCAPE_MAP_DOMINANT_MEDIA;
    },
    media: query,
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
  }));
}

function ChipProbe() {
  const { chip } = useMapLandscapeChrome();
  return <>{chip}</>;
}

function renderProvider(chromeOccupied: boolean) {
  return render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <MapLandscapeChromeProvider
        chromeOccupied={chromeOccupied}
        sessionRules={{ gameSize: "medium" }}
        timerState={{ runningSince: null, accumulatedMs: 0 }}
        timerHasStarted={false}
        syncStatus="synced"
        queuedWrites={0}
      >
        <ChipProbe />
      </MapLandscapeChromeProvider>
    </MantineProvider>,
  );
}

describe("MapLandscapeChromeProvider chrome occupancy", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("hides the landscape chip while chrome is occupied", () => {
    mockLandscapeMedia();
    renderProvider(true);
    expect(screen.queryByRole("button", { name: /map controls/i })).toBeNull();
  });

  it("shows the landscape chip when chrome is free", () => {
    mockLandscapeMedia();
    renderProvider(false);
    expect(screen.getByRole("button", { name: /Show map controls/i })).toBeInTheDocument();
  });
});
