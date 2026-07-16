import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  latLngBounds,
  map as createMap,
  point,
  type Map as LeafletMap,
} from "leaflet";
import { computeFramedCenterZoom } from "./computeFramedCenterZoom";

function createSizedMap(): { container: HTMLDivElement; map: LeafletMap } {
  const container = document.createElement("div");
  container.style.width = "800px";
  container.style.height = "600px";
  document.body.appendChild(container);
  const map = createMap(container, { center: [53.34, -6.26], zoom: 10 });
  map.invalidateSize();
  return { container, map };
}

describe("computeFramedCenterZoom", () => {
  const cleanups: Array<() => void> = [];

  beforeEach(() => {
    cleanups.length = 0;
  });

  afterEach(() => {
    for (const cleanup of cleanups.reverse()) {
      cleanup();
    }
  });

  it("matches fitBounds center and zoom with symmetric padding and no clamps", () => {
    const bounds = latLngBounds([
      [53.3, -6.35],
      [53.38, -6.25],
    ]);
    const paddingTopLeft = point(32, 32);
    const paddingBottomRight = point(32, 32);

    const computed = createSizedMap();
    cleanups.push(() => {
      computed.map.remove();
      computed.container.remove();
    });

    const reference = createSizedMap();
    cleanups.push(() => {
      reference.map.remove();
      reference.container.remove();
    });

    const { center, zoom } = computeFramedCenterZoom(
      computed.map,
      bounds,
      paddingTopLeft,
      paddingBottomRight,
    );

    reference.map.fitBounds(bounds, {
      paddingTopLeft,
      paddingBottomRight,
      animate: false,
    });

    expect(zoom).toBeCloseTo(reference.map.getZoom(), 5);
    expect(center.lat).toBeCloseTo(reference.map.getCenter().lat, 6);
    expect(center.lng).toBeCloseTo(reference.map.getCenter().lng, 6);
  });

  it("matches fitBounds center and zoom with asymmetric padding", () => {
    const bounds = latLngBounds([
      [53.3, -6.35],
      [53.38, -6.25],
    ]);
    const paddingTopLeft = point(24, 48);
    const paddingBottomRight = point(80, 16);

    const computed = createSizedMap();
    cleanups.push(() => {
      computed.map.remove();
      computed.container.remove();
    });

    const reference = createSizedMap();
    cleanups.push(() => {
      reference.map.remove();
      reference.container.remove();
    });

    const { center, zoom } = computeFramedCenterZoom(
      computed.map,
      bounds,
      paddingTopLeft,
      paddingBottomRight,
    );

    reference.map.fitBounds(bounds, {
      paddingTopLeft,
      paddingBottomRight,
      animate: false,
    });

    expect(zoom).toBeCloseTo(reference.map.getZoom(), 5);
    expect(center.lat).toBeCloseTo(reference.map.getCenter().lat, 6);
    expect(center.lng).toBeCloseTo(reference.map.getCenter().lng, 6);
  });

  it("clamps zoom to maxZoom and recomputes center at the capped level", () => {
    const bounds = latLngBounds([
      [53.339, -6.265],
      [53.341, -6.255],
    ]);
    const paddingTopLeft = point(32, 32);
    const paddingBottomRight = point(32, 32);
    const maxZoom = 12;

    const computed = createSizedMap();
    cleanups.push(() => {
      computed.map.remove();
      computed.container.remove();
    });

    const reference = createSizedMap();
    cleanups.push(() => {
      reference.map.remove();
      reference.container.remove();
    });

    const unclamped = computeFramedCenterZoom(
      computed.map,
      bounds,
      point(32, 32),
      point(32, 32),
    );
    expect(unclamped.zoom).toBeGreaterThan(maxZoom);

    const { center, zoom } = computeFramedCenterZoom(
      computed.map,
      bounds,
      point(32, 32),
      point(32, 32),
      undefined,
      maxZoom,
    );

    reference.map.fitBounds(bounds, {
      paddingTopLeft,
      paddingBottomRight,
      maxZoom,
      animate: false,
    });

    expect(zoom).toBe(maxZoom);
    expect(zoom).toBeCloseTo(reference.map.getZoom(), 5);
    expect(center.lat).toBeCloseTo(reference.map.getCenter().lat, 6);
    expect(center.lng).toBeCloseTo(reference.map.getCenter().lng, 6);
  });

  it("clamps zoom to minZoom", () => {
    const bounds = latLngBounds([
      [53.3, -6.35],
      [53.38, -6.25],
    ]);
    const minZoom = 8;

    const computed = createSizedMap();
    cleanups.push(() => {
      computed.map.remove();
      computed.container.remove();
    });

    const unclamped = computeFramedCenterZoom(
      computed.map,
      bounds,
      point(0, 0),
      point(0, 0),
    );
    expect(unclamped.zoom).toBeLessThan(minZoom);

    const { zoom } = computeFramedCenterZoom(
      computed.map,
      bounds,
      point(0, 0),
      point(0, 0),
      minZoom,
    );

    expect(zoom).toBe(minZoom);
  });
});
