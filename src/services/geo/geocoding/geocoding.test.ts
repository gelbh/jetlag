import { afterEach, describe, expect, it, vi } from "vitest";
import { createLoadTask, type LoadTask } from "@/services/core/progress/loadTask";
import { parseNominatimResult, searchPlaces } from "./index";

describe("geocoding", () => {
  it("parses nominatim bounding boxes into map bounds", async () => {
    const place = await parseNominatimResult({
      place_id: 42,
      display_name: "Dublin, County Dublin, Ireland",
      lat: "53.3498",
      lon: "-6.2603",
      boundingbox: ["53.2", "53.5", "-6.5", "-6.0"],
      addresstype: "city",
    });

    expect(place.displayName).toContain("Dublin");
    expect(place.bounds).toEqual({
      south: 53.2,
      north: 53.5,
      west: -6.5,
      east: -6,
    });
    expect(place.center).toEqual([53.3498, -6.2603]);
    expect(place.boundary).toBeUndefined();
    expect(place.placeCategory).toBe("city");
    expect(place.approximateAreaSqMi).toBeGreaterThan(0);
  });

  it("parses administrative boundaries when Nominatim returns geojson", async () => {
    const place = await parseNominatimResult({
      place_id: 43,
      display_name: "County Dublin, Ireland",
      lat: "53.3498",
      lon: "-6.2603",
      boundingbox: ["53.2", "53.5", "-6.5", "-6.0"],
      addresstype: "county",
      geojson: {
        type: "Polygon",
        coordinates: [
          [
            [-6.5, 53.2],
            [-6.0, 53.2],
            [-6.0, 53.5],
            [-6.5, 53.5],
            [-6.5, 53.2],
          ],
        ],
      },
    });

    expect(place.boundary?.type).toBe("Polygon");
    expect(place.boundary?.coordinates[0]).toHaveLength(5);
    expect(place.placeCategory).toBe("county");
    expect(place.approximateAreaSqMi).toBeGreaterThan(0);
  });
});

describe("searchPlaces progress", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function stubNominatim() {
    return vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async () => new Response("[]", { status: 200 }));
  }

  function countedStages(task: LoadTask) {
    const counts: Array<[number, number]> = [];
    const setCount = Object.getPrototypeOf(task.root).setCount;
    vi.spyOn(Object.getPrototypeOf(task.root), "setCount").mockImplementation(function (
      this: unknown,
      ...args: unknown[]
    ) {
      counts.push(args as [number, number]);
      return setCount.apply(this, args);
    });
    return counts;
  }

  it("counts both Nominatim requests of an unbiased search", async () => {
    const fetchMock = stubNominatim();
    const task = createLoadTask({ label: "Searching places" });
    const counts = countedStages(task);

    await searchPlaces(`progress-unbiased-${Date.now()}`, { node: task.root });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(counts).toEqual([
      [0, 2],
      [1, 2],
      [2, 2],
    ]);
    expect(task.root.children.every((child) => child.isFinished)).toBe(true);
  });

  it("counts the unbiased and biased passes side by side", async () => {
    const fetchMock = stubNominatim();
    const task = createLoadTask({ label: "Searching places" });
    const counts = countedStages(task);

    await searchPlaces(`progress-biased-${Date.now()}`, {
      near: [53.35, -6.26],
      node: task.root,
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(counts.filter(([done]) => done === 2)).toHaveLength(2);
    const passes = task.root.children[0];
    expect(passes?.spec.parallel).toBe(true);
    expect(passes?.children).toHaveLength(2);
  });

  it("stops the requests when the signal aborts", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const controller = new AbortController();
    const search = searchPlaces(`progress-abort-${Date.now()}`, { signal: controller.signal });

    controller.abort(new DOMException("Superseded.", "AbortError"));

    await expect(search).rejects.toMatchObject({ name: "AbortError" });
  });
});
