import { render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import type { MapViewModel } from "@/components/map/chrome/mapViewTypes";
import { CreateSessionMapPane } from "./CreateSessionMapPane";

let lastMapViewModel: MapViewModel | null = null;

vi.mock("@/components/map/chrome/MapView", () => ({
  MapView: ({
    model,
    children,
  }: {
    model: MapViewModel;
    children?: React.ReactNode;
  }) => {
    lastMapViewModel = model;
    return <div data-testid="create-session-map">{children}</div>;
  },
}));

vi.mock("@/components/map/layers/FramingPreviewLayers", () => ({
  FramingPreviewLayers: () => null,
}));

vi.mock("@/components/map/layers/GameAreaMask", () => ({
  GameAreaMask: () => null,
}));

beforeEach(() => {
  lastMapViewModel = null;
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
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal(
    "requestIdleCallback",
    (cb: IdleRequestCallback) => {
      cb({ didTimeout: false, timeRemaining: () => 50 });
      return 0;
    },
  );
  vi.stubGlobal("cancelIdleCallback", vi.fn());
});

describe("CreateSessionMapPane", () => {
  it("hides zoom, map style, and compass chrome on the MapView model", async () => {
    const onMapStyleChange = vi.fn();

    render(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <CreateSessionMapPane
          mapStyle="standard"
          onMapStyleChange={onMapStyleChange}
          focusBounds={null}
          previewGameArea={null}
          selectedGameSize="medium"
          manualFramingActive={false}
          framingMode="rectangle"
          circleCenter={null}
          circleRadiusMeters={null}
          polygonVertices={[]}
          onBoundsChange={vi.fn()}
          onUserViewportFramed={vi.fn()}
        />
      </MantineProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("create-session-map")).toBeInTheDocument();
    });

    expect(lastMapViewModel).not.toBeNull();
    expect(lastMapViewModel?.showZoomControl).toBe(false);
    expect(lastMapViewModel?.showMapStyleToggle).toBe(false);
    expect(lastMapViewModel?.showCompassControl).toBe(false);
    expect(lastMapViewModel?.mapStyle).toBe("standard");
    expect(lastMapViewModel).not.toHaveProperty("onMapStyleChange");
  });
});
