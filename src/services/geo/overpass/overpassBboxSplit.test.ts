import { describe, expect, it, vi } from "vitest";
import { createProgressRoot, type ProgressNode } from "@/domain/progress/progressTree";
import {
  OverpassPayloadTooLargeError,
  OverpassQueryTooExpensiveError,
  OverpassUnavailableError,
} from "../../core/overpass/overpassClient";
import {
  mergeOverpassElementPayloads,
  OVERPASS_SPLIT_MIN_SPAN_DEG,
  queryOverpassWithBboxSplit,
} from "./overpassBboxSplit";

describe("queryOverpassWithBboxSplit", () => {
  it("retries 413 with four child bboxes and merges elements", async () => {
    type Payload = { elements: { id: number }[] };
    const query = vi
      .fn<(ql: string) => Promise<Payload>>()
      .mockRejectedValueOnce(new OverpassPayloadTooLargeError())
      .mockResolvedValueOnce({ elements: [{ id: 1 }] })
      .mockResolvedValueOnce({ elements: [{ id: 2 }] })
      .mockResolvedValueOnce({ elements: [{ id: 3 }] })
      .mockResolvedValueOnce({ elements: [{ id: 4 }] });

    const merged = await queryOverpassWithBboxSplit(
      (bbox) => `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`,
      { south: 0, west: 0, north: 1, east: 1 },
      query,
      mergeOverpassElementPayloads,
    );

    expect(query.mock.calls.length).toBeGreaterThan(1);
    expect(merged.elements.map((el) => el.id).sort()).toEqual([1, 2, 3, 4]);
  });

  it("rethrows 413 when bbox is already at minimum span", async () => {
    type Payload = { elements: { id: number }[] };
    const query = vi
      .fn<(ql: string) => Promise<Payload>>()
      .mockRejectedValue(new OverpassPayloadTooLargeError());
    await expect(
      queryOverpassWithBboxSplit(
        () => "q",
        {
          south: 0,
          west: 0,
          north: OVERPASS_SPLIT_MIN_SPAN_DEG,
          east: OVERPASS_SPLIT_MIN_SPAN_DEG,
        },
        query,
        mergeOverpassElementPayloads,
      ),
    ).rejects.toBeInstanceOf(OverpassPayloadTooLargeError);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("retries too-expensive errors with four child bboxes and merges elements", async () => {
    type Payload = { elements: { id: number }[] };
    const query = vi
      .fn<(ql: string) => Promise<Payload>>()
      .mockRejectedValueOnce(new OverpassQueryTooExpensiveError())
      .mockResolvedValueOnce({ elements: [{ id: 1 }] })
      .mockResolvedValueOnce({ elements: [{ id: 2 }] })
      .mockResolvedValueOnce({ elements: [{ id: 3 }] })
      .mockResolvedValueOnce({ elements: [{ id: 4 }] });

    const merged = await queryOverpassWithBboxSplit(
      (bbox) => `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`,
      { south: 0, west: 0, north: 1, east: 1 },
      query,
      mergeOverpassElementPayloads,
    );

    expect(query.mock.calls.length).toBe(5);
    expect(merged.elements.map((el) => el.id).sort()).toEqual([1, 2, 3, 4]);
  });

  it("does not split OverpassUnavailableError", async () => {
    type Payload = { elements: { id: number }[] };
    const query = vi
      .fn<(ql: string) => Promise<Payload>>()
      .mockRejectedValue(new OverpassUnavailableError());
    await expect(
      queryOverpassWithBboxSplit(
        () => "q",
        { south: 0, west: 0, north: 1, east: 1 },
        query,
        mergeOverpassElementPayloads,
      ),
    ).rejects.toBeInstanceOf(OverpassUnavailableError);
    expect(query).toHaveBeenCalledTimes(1);
  });
});

describe("queryOverpassWithBboxSplit cancellation and progress", () => {
  type Payload = { elements: { id: number }[] };
  const bbox = { south: 0, west: 0, north: 1, east: 1 };

  it("never splits on a cancel", async () => {
    const controller = new AbortController();
    const query = vi.fn<(ql: string) => Promise<Payload>>().mockImplementation(async () => {
      controller.abort(new DOMException("Cancelled.", "AbortError"));
      throw new OverpassQueryTooExpensiveError();
    });
    await expect(
      queryOverpassWithBboxSplit(() => "q", bbox, query, mergeOverpassElementPayloads, {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("stops remaining quadrants after a cancel between children", async () => {
    const controller = new AbortController();
    const query = vi
      .fn<(ql: string) => Promise<Payload>>()
      .mockRejectedValueOnce(new OverpassQueryTooExpensiveError())
      .mockImplementationOnce(async () => {
        controller.abort(new DOMException("Cancelled.", "AbortError"));
        return { elements: [{ id: 1 }] };
      })
      .mockResolvedValue({ elements: [{ id: 2 }] });
    await expect(
      queryOverpassWithBboxSplit(() => "q", bbox, query, mergeOverpassElementPayloads, {
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it("splits the progress node into quadrant stages and finishes it", async () => {
    let now = 0;
    const root = createProgressRoot("Task", { now: () => now, expectedMs: () => 1_000 });
    const node = root.stage({ kind: "fetch", label: "Searching map data", historyKey: "x" });
    const seen: Array<ProgressNode | undefined> = [];
    const query = vi
      .fn<(ql: string, child?: ProgressNode) => Promise<Payload>>()
      .mockImplementationOnce(async () => {
        now += 500;
        throw new OverpassQueryTooExpensiveError();
      })
      .mockImplementation(async (_ql, child) => {
        seen.push(child);
        child?.start().finish();
        return { elements: [{ id: seen.length }] };
      });
    await queryOverpassWithBboxSplit(() => "q", bbox, query, mergeOverpassElementPayloads, {
      node,
    });
    expect(node.children).toHaveLength(4);
    expect(seen).toEqual(node.children);
    expect(node.isFinished).toBe(true);
    expect(node.label).toBe("Searching map data");
  });

  it("labels each part on the running child stage, nesting part numbers", async () => {
    const root = createProgressRoot("Task", { now: () => 0, expectedMs: () => 1_000 });
    const node = root.stage({ kind: "fetch", label: "Searching map data", historyKey: "x" });
    const labels: string[] = [];
    let calls = 0;
    const query = vi
      .fn<(ql: string, child?: ProgressNode) => Promise<Payload>>()
      .mockImplementation(async (_ql, child) => {
        calls += 1;
        // Top level and the first quadrant are too big; everything else succeeds.
        if (calls <= 2) {
          throw new OverpassQueryTooExpensiveError();
        }
        labels.push(child?.label ?? "");
        child?.start().finish();
        return { elements: [] };
      });
    await queryOverpassWithBboxSplit(() => "q", bbox, query, mergeOverpassElementPayloads, {
      node,
    });
    expect(labels[0]).toBe("Searching map data (part 1 of 4, 1 of 4)");
    expect(labels).toContain("Searching map data (part 2 of 4)");
  });
});
