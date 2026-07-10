/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from "react";

export function MapContainer({
  children,
}: {
  children?: ReactNode;
  center?: [number, number];
  zoom?: number;
}) {
  return <div data-testid="leaflet-map">{children}</div>;
}

export function TileLayer() {
  return null;
}

export function Marker({ children }: { children?: ReactNode }) {
  return <div data-testid="leaflet-marker">{children}</div>;
}

export function Popup({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}

export function Circle() {
  return null;
}

export function Polygon() {
  return null;
}

export function Polyline() {
  return null;
}

export function useMap() {
  return {
    getBounds: () => ({
      getSouth: () => 53.27,
      getNorth: () => 53.42,
      getWest: () => -6.45,
      getEast: () => -6.08,
    }),
    getContainer: () => document.createElement("div"),
    getZoom: () => 12,
    getMinZoom: () => 0,
    getMaxZoom: () => 20,
    zoomIn: () => undefined,
    zoomOut: () => undefined,
    on: () => undefined,
    off: () => undefined,
    latLngToContainerPoint: () => ({ x: 0, y: 0 }),
  };
}

export function useMapEvents() {
  return null;
}
