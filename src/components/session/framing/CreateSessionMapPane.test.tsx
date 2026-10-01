import { act, fireEvent, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jetlagTheme } from "@/theme/theme";
import type { MapViewModel } from "@/components/map/chrome/mapViewTypes";
import { createMapBounds } from "@/domain/map/mapBounds";
import { CreateSessionMapPane } from "./CreateSessionMapPane";

let lastMapViewModel: MapViewModel | null = null;
const fakeCanvas = { focus: vi.fn() };
const fakeMap = { getCanvas: () => fakeCanvas };
const prefetchCreateSessionMap = vi.fn(() => Promise.resolve());
const scheduleWhenIdleAfterLoad = vi.fn((callback: () => void) => {
  callback();
  return () => undefined;
});

vi.mock("./prefetchCreateSessionMap", () => ({
  prefetchCreateSessionMap: () => prefetchCreateSessionMap(),
}));

vi.mock("@/domain/device/perf/scheduleWhenIdleAfterLoad", () => ({
  scheduleWhenIdleAfterLoad: (callback: () => void) =>
    scheduleWhenIdleAfterLoad(callback),
}));

vi.mock("@/components/map/helpers/useMapLibreMap", () => ({
  useMapLibreMap: () => ({ getMap: () => fakeMap }),
}));

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
  fakeCanvas.focus.mockClear();
  prefetchCreateSessionMap.mockClear();
  scheduleWhenIdleAfterLoad.mockClear();
});

type PaneProps = ComponentProps<typeof CreateSessionMapPane>;

function renderPane(overrides: Partial<PaneProps> = {}) {
  const props: PaneProps = {
    mapStyle: "standard",
    focusBounds: null,
    previewGameArea: null,
    selectedGameSize: "medium",
    manualFramingActive: true,
    framingMode: "rectangle",
    circleCenter: null,
    circleRadiusMeters: null,
    polygonVertices: [],
    mapRequested: true,
    mapMounted: true,
    onRequestMap: vi.fn(),
    onMapMounted: vi.fn(),
    onBoundsChange: vi.fn(),
    onUserViewportFramed: vi.fn(),
    ...overrides,
  };
  const view = render(
    <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
      <CreateSessionMapPane {...props} />
    </MantineProvider>,
  );
  return { ...view, props };
}

const usableBounds = createMapBounds({
  south: 51.4,
  west: -0.2,
  north: 51.6,
  east: 0.1,
});

describe("CreateSessionMapPane", () => {
  it("hides zoom, map style, and compass chrome on the MapView model", () => {
    renderPane({ manualFramingActive: false });

    expect(screen.getByTestId("create-session-map")).toBeInTheDocument();
    expect(lastMapViewModel).not.toBeNull();
    expect(lastMapViewModel?.showZoomControl).toBe(false);
    expect(lastMapViewModel?.showMapStyleToggle).toBe(false);
    expect(lastMapViewModel?.showCompassControl).toBe(false);
    expect(lastMapViewModel?.mapStyle).toBe("standard");
    expect(lastMapViewModel).not.toHaveProperty("onMapStyleChange");
  });

  it("renders an accessible facade instead of the map until intent", () => {
    const { props } = renderPane({ mapRequested: false, mapMounted: false });

    expect(screen.queryByTestId("create-session-map")).not.toBeInTheDocument();
    const facade = screen.getByRole("button", { name: "Open map" });
    expect(facade).toHaveAccessibleDescription(
      "Frame your play area by hand, or search a place below.",
    );

    fireEvent.click(facade);

    expect(props.onRequestMap).toHaveBeenCalledTimes(1);
  });

  it("prefetches the map chunk on idle and on hover/focus without mounting it", () => {
    renderPane({ mapRequested: false, mapMounted: false });

    expect(scheduleWhenIdleAfterLoad).toHaveBeenCalledTimes(1);
    expect(prefetchCreateSessionMap).toHaveBeenCalledTimes(1);

    const facade = screen.getByRole("button", { name: "Open map" });
    fireEvent.pointerEnter(facade);
    fireEvent.focus(facade);

    expect(prefetchCreateSessionMap).toHaveBeenCalledTimes(3);
    expect(screen.queryByTestId("create-session-map")).not.toBeInTheDocument();
  });

  it("keeps a loading plate over the map until it reports a viewport", () => {
    renderPane({ mapRequested: true, mapMounted: false });

    expect(screen.getByTestId("create-session-map")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading map…");
    expect(
      screen.queryByRole("button", { name: "Open map" }),
    ).not.toBeInTheDocument();
  });

  it("signals mount once MapLibre exists and has reported its first bounds", () => {
    const { props } = renderPane({ mapRequested: true, mapMounted: false });

    expect(props.onMapMounted).not.toHaveBeenCalled();

    act(() => {
      lastMapViewModel?.onBoundsChange?.(usableBounds);
    });

    expect(props.onBoundsChange).toHaveBeenCalledWith(usableBounds);
    expect(props.onMapMounted).toHaveBeenCalledTimes(1);
    expect(props.onMapMounted).toHaveBeenCalledWith(fakeMap);

    act(() => {
      lastMapViewModel?.onBoundsChange?.(usableBounds);
    });

    expect(props.onMapMounted).toHaveBeenCalledTimes(1);
  });

  it("moves focus into the map after keyboard activation of the facade", () => {
    const { props, rerender } = renderPane({
      mapRequested: false,
      mapMounted: false,
    });

    // detail 0 = keyboard-initiated click (Enter / Space).
    fireEvent.click(screen.getByRole("button", { name: "Open map" }), {
      detail: 0,
    });

    rerender(
      <MantineProvider theme={jetlagTheme} forceColorScheme="dark">
        <CreateSessionMapPane {...props} mapRequested mapMounted={false} />
      </MantineProvider>,
    );
    act(() => {
      lastMapViewModel?.onBoundsChange?.(usableBounds);
    });

    expect(fakeCanvas.focus).toHaveBeenCalledTimes(1);
  });
});
