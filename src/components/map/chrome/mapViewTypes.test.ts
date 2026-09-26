import { describe, expect, it } from "vitest";
import type {
  MapViewMapLibreProps,
  MapViewModel,
  MapViewProps,
} from "./mapViewTypes";

describe("MapView public props (AC #1)", () => {
  it("accepts a single model options object plus optional children", () => {
    const model: MapViewModel = {
      zoom: 10,
      className: "h-full w-full",
    };
    const props: MapViewProps = {
      model,
    };
    const keys = Object.keys(props) as Array<keyof MapViewProps>;
    expect(keys).toEqual(["model"]);
    expect(keys.length).toBeLessThanOrEqual(10);

    const withChildren: MapViewMapLibreProps = {
      model,
      children: null,
    };
    expect(Object.keys(withChildren).sort()).toEqual(["children", "model"]);
  });
});
