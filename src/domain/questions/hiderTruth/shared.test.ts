import { describe, expect, it } from "vitest";
import { truthUnavailableForReference, UNAVAILABLE_NO_ANCHOR, UNAVAILABLE_NO_ZONE } from "./shared";

describe("truthUnavailableForReference", () => {
  it("asks for a zone before end game and names the missing anchor during it", () => {
    expect(truthUnavailableForReference("noHidingZone").label).toBe(UNAVAILABLE_NO_ZONE);
    expect(truthUnavailableForReference("unavailable").label).toBe(UNAVAILABLE_NO_ANCHOR);
  });
});
