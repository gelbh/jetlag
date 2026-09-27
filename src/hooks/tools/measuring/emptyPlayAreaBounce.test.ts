import { describe, expect, it } from "vitest";
import { measuringPlaceNotFoundMessage } from "@/services/geo/overpass/measuringPlaces";
import {
  isMeasuringEmptyPlayAreaCatalog,
  markMeasuringFromKindUnavailable,
} from "./emptyPlayAreaBounce";

describe("measuring emptyPlayAreaBounce", () => {
  it("marks from-kind unavailable and reopens catalog on empty play area", () => {
    expect(isMeasuringEmptyPlayAreaCatalog(0)).toBe(true);
    expect(isMeasuringEmptyPlayAreaCatalog(1)).toBe(false);

    const notice = measuringPlaceNotFoundMessage("zoo");
    const { unavailableMeasuringFromKinds, catalogNotice } =
      markMeasuringFromKindUnavailable(new Map(), "zoo", notice);

    // After empty fetch for zoo: unavailable has zoo, catalogNotice set,
    // and no submitPendingQuestion call.
    expect(unavailableMeasuringFromKinds.get("zoo")).toBe(notice);
    expect(catalogNotice).toBe("No named zoo found in this play area.");
  });
});
