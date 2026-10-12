import { describe, expect, it } from "vitest";
import {
  manualPinsWithinRadius,
  setupPinsForCategory,
  taggedSetupPinsForCategory,
} from "./sessionCustomCatalog";
import { parseCustomLocationPins, type SessionCustomLocationPin } from "./sessionCustomContent";

const untagged: SessionCustomLocationPin = { id: "a", name: "Any", point: [53.35, -6.26] };
const zoo: SessionCustomLocationPin = {
  id: "z",
  name: "Zoo",
  point: [53.35, -6.26],
  category: "zoo",
};

describe("parseCustomLocationPins", () => {
  it("keeps a known POI category and drops an unknown one", () => {
    expect(
      parseCustomLocationPins([
        { id: "z", name: "Zoo", point: [53.35, -6.26], category: "zoo" },
        { id: "x", name: "Odd", point: [53.35, -6.26], category: "volcano" },
      ]),
    ).toEqual([zoo, { id: "x", name: "Odd", point: [53.35, -6.26] }]);
  });
});

describe("setupPinsForCategory", () => {
  it("offers untagged pins everywhere and tagged pins only for their category", () => {
    expect(setupPinsForCategory([untagged, zoo], "zoo")).toEqual([untagged, zoo]);
    expect(setupPinsForCategory([untagged, zoo], "museum")).toEqual([untagged]);
  });

  it("offers only tagged pins to Matching", () => {
    expect(taggedSetupPinsForCategory([untagged, zoo], "zoo")).toEqual([zoo]);
    expect(taggedSetupPinsForCategory([untagged, zoo], "museum")).toEqual([]);
  });

  it("filters tagged pins out of other tentacle categories", () => {
    const ids = (categoryId: "zoo" | "museum") =>
      manualPinsWithinRadius([untagged, zoo], [53.35, -6.26], 1000, categoryId).map((p) => p.id);
    expect(ids("zoo")).toEqual(["a", "z"]);
    expect(ids("museum")).toEqual(["a"]);
  });
});
