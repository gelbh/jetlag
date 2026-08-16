import { describe, expect, it, vi } from "vitest";
import { OverpassPayloadTooLargeError } from "../../core/overpass/overpassClient";
import {
  OVERPASS_SPLIT_MIN_SPAN_DEG,
  mergeOverpassElementPayloads,
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
});
