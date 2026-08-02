import { vi } from "vitest";

vi.mock("react-map-gl/maplibre", async () => {
  const React = await import("react");
  return {
    Map: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "maplibre-map" }, children),
    Marker: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "maplibre-marker" }, children),
    Popup: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "maplibre-popup" }, children),
    Source: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "maplibre-source" }, children),
    Layer: () => null,
    useMap: () => ({ current: null }),
  };
});

vi.mock("maplibre-gl", () => ({
  setWorkerUrl: vi.fn(),
}));
