import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import { MeasuringMapPlacementChrome } from "./measuring/MeasuringMapPlacementChrome";
import { PhotoMapPlacementChrome } from "./photo/PhotoMapPlacementChrome";
import { expectBusyPrimary, expectUnavailablePrimary } from "./primaryActionContract.testAssert";
import { RadarMapPlacementChrome } from "./radar/RadarMapPlacementChrome";
import { TentacleMapPlacementChrome } from "./tentacle/TentacleMapPlacementChrome";
import { ThermometerMapPlacementChrome } from "./thermometer/ThermometerMapPlacementChrome";

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

function mantine(children: React.ReactNode) {
  return (
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      {children}
    </MantineProvider>
  );
}

type PrimaryRender = () => { onCommit: ReturnType<typeof vi.fn> };

function primaryPair(renderChrome: (onCommit: ReturnType<typeof vi.fn>, busy: boolean) => void): {
  renderUnavailable: PrimaryRender;
  renderBusy: PrimaryRender;
} {
  return {
    renderUnavailable() {
      const onCommit = vi.fn();
      renderChrome(onCommit, false);
      return { onCommit };
    },
    renderBusy() {
      const onCommit = vi.fn();
      renderChrome(onCommit, true);
      return { onCommit };
    },
  };
}

const primaryActionTools = [
  {
    id: "measuring",
    ...primaryPair((onCommit, busy) => {
      render(
        mantine(
          <MeasuringMapPlacementChrome
            configureLabel="Metro station"
            questionPrompt="Are you closer or further?"
            phase="answer"
            onUseGps={vi.fn()}
            awaitHiderAnswer
            distanceUnit="metric"
            statusTitle="Ready"
            statusBody="Place set"
            canCommit={busy}
            isSubmitting={busy || undefined}
            onCommit={onCommit}
          />,
        ),
      );
    }),
  },
  {
    id: "photo",
    ...primaryPair((onCommit, busy) => {
      render(
        mantine(
          <PhotoMapPlacementChrome
            categoryLabel="Landmark"
            questionPrompt="Send a photo"
            canCommit={busy}
            isSubmitting={busy || undefined}
            onCommit={onCommit}
          />,
        ),
      );
    }),
  },
  {
    id: "radar",
    ...primaryPair((onCommit, busy) => {
      render(
        mantine(
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
            canCommit={busy}
            isSubmitting={busy || undefined}
            onCommit={onCommit}
          />,
        ),
      );
    }),
  },
  {
    id: "tentacle",
    ...primaryPair((onCommit, busy) => {
      render(
        mantine(
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
            canCommit={busy}
            isSubmitting={busy || undefined}
            onCommit={onCommit}
          />,
        ),
      );
    }),
  },
  {
    id: "thermometer",
    ...primaryPair((onCommit, busy) => {
      render(
        mantine(
          <ThermometerMapPlacementChrome
            distanceLabel="500 m"
            questionPrompt="Hotter or colder?"
            pinStep="ready"
            placementMode="manual"
            onPlacementModeChange={vi.fn()}
            onStartWalk={vi.fn()}
            awaitHiderAnswer
            canCommit={busy}
            isSubmitting={busy || undefined}
            onCommit={onCommit}
          />,
        ),
      );
    }),
  },
] as const;

describe("MapPlacementChrome primary Send action", () => {
  it.each(primaryActionTools)(
    "$id marks Send unavailable when !canCommit",
    ({ renderUnavailable }) => {
      const { onCommit } = renderUnavailable();
      expectUnavailablePrimary(screen.getByRole("button", { name: /^Send to hiders$/i }), onCommit);
    },
  );

  it.each(primaryActionTools)(
    "$id keeps Send busy without native disable while submitting",
    ({ renderBusy }) => {
      const { onCommit } = renderBusy();
      expectBusyPrimary(screen.getByRole("button", { name: "Sending…" }), onCommit);
    },
  );
});
