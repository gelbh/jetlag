import { beforeEach, describe, expect, it } from "vitest";
import {
  clearOverpassHostCooldownsForTests,
  isOverpassHostCooled,
  recordOverpassHostCooldown,
} from "./overpassHostCooldown";

describe("overpassHostCooldown", () => {
  beforeEach(() => {
    clearOverpassHostCooldownsForTests();
  });

  it("cools a host for 30s", () => {
    const now = 1_000_000;
    recordOverpassHostCooldown("overpass-api.de", now);
    expect(isOverpassHostCooled("overpass-api.de", now + 29_999)).toBe(true);
    expect(isOverpassHostCooled("overpass-api.de", now + 30_000)).toBe(false);
    expect(isOverpassHostCooled("maps.mail.ru", now)).toBe(false);
  });
});
