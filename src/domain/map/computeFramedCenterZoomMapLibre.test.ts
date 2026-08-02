import { describe, expect, it, vi } from "vitest";
import type { LngLatBoundsLike, Map as MapLibreMap, PaddingOptions } from "maplibre-gl";
import {
  computeFramedCenterZoomMapLibre,
  computePaddedCenterAtZoom,
  projectLngLatAtZoom,
  unprojectPointAtZoom,
} from "./computeFramedCenterZoomMapLibre";

describe("computePaddedCenterAtZoom", () => {
  const sw = { lng: -6.35, lat: 53.3 };
  const ne = { lng: -6.25, lat: 53.38 };

  it("round-trips project/unproject at a given zoom", () => {
    const zoom = 12;
    const projected = projectLngLatAtZoom(sw, zoom);
    const back = unprojectPointAtZoom(projected, zoom);
    expect(back.lng).toBeCloseTo(sw.lng, 8);
    expect(back.lat).toBeCloseTo(sw.lat, 8);
  });

  it("matches the mercator midpoint with symmetric padding", () => {
    const padding: PaddingOptions = { top: 32, bottom: 32, left: 32, right: 32 };
    const center = computePaddedCenterAtZoom(sw, ne, padding, 11);
    const swPoint = projectLngLatAtZoom(sw, 11);
    const nePoint = projectLngLatAtZoom(ne, 11);
    const expected = unprojectPointAtZoom(
      { x: (swPoint.x + nePoint.x) / 2, y: (swPoint.y + nePoint.y) / 2 },
      11,
    );
    expect(center.lng).toBeCloseTo(expected.lng, 8);
    expect(center.lat).toBeCloseTo(expected.lat, 8);
  });

  it("shifts center north when bottom padding exceeds top (panel bias)", () => {
    const symmetric = computePaddedCenterAtZoom(
      sw,
      ne,
      { top: 32, bottom: 32, left: 24, right: 24 },
      11,
    );
    const biased = computePaddedCenterAtZoom(
      sw,
      ne,
      { top: 32, bottom: 32 + 120, left: 24, right: 24 },
      11,
    );
    // Extra bottom padding → map center moves south → content sits higher.
    expect(biased.lat).toBeLessThan(symmetric.lat);
    expect(biased.lng).toBeCloseTo(symmetric.lng, 6);
  });
});

describe("computeFramedCenterZoomMapLibre", () => {
  it("recomputes center when minZoom clamps camera zoom", () => {
    const bounds: LngLatBoundsLike = [
      [-6.35, 53.3],
      [-6.25, 53.38],
    ];
    const padding: PaddingOptions = { top: 24, bottom: 160, left: 32, right: 32 };
    const unclampedZoom = 9;
    const minZoom = 11;
    const cameraCenter = { lng: -6.3, lat: 53.34 };

    const map = {
      cameraForBounds: vi.fn(() => ({
        center: cameraCenter,
        zoom: unclampedZoom,
      })),
    } as unknown as MapLibreMap;

    const framed = computeFramedCenterZoomMapLibre(
      map,
      bounds,
      padding,
      minZoom,
    );

    expect(framed).not.toBeNull();
    expect(framed!.zoom).toBe(minZoom);
    const expected = computePaddedCenterAtZoom(
      { lng: -6.35, lat: 53.3 },
      { lng: -6.25, lat: 53.38 },
      padding,
      minZoom,
    );
    expect(framed!.center.lng).toBeCloseTo(expected.lng, 8);
    expect(framed!.center.lat).toBeCloseTo(expected.lat, 8);
    expect(framed!.center.lat).not.toBeCloseTo(cameraCenter.lat, 4);
  });

  it("keeps cameraForBounds center when zoom is unchanged", () => {
    const bounds: LngLatBoundsLike = [
      [-6.35, 53.3],
      [-6.25, 53.38],
    ];
    const padding: PaddingOptions = { top: 32, bottom: 32, left: 32, right: 32 };
    const cameraCenter = { lng: -6.301, lat: 53.339 };

    const map = {
      cameraForBounds: vi.fn(() => ({
        center: cameraCenter,
        zoom: 10,
      })),
    } as unknown as MapLibreMap;

    const framed = computeFramedCenterZoomMapLibre(map, bounds, padding);
    expect(framed).toEqual({ center: cameraCenter, zoom: 10 });
  });
});
