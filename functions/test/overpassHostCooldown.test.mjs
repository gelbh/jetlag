import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  clearOverpassHostCooldownsForTests,
  isOverpassHostCooled,
  recordOverpassHostCooldown,
} from "../proxies/overpassHostCooldown.mjs";

describe("overpassHostCooldown", () => {
  beforeEach(() => {
    clearOverpassHostCooldownsForTests();
  });

  it("cools a host for 30s", () => {
    const now = 1_000_000;
    recordOverpassHostCooldown("overpass-api.de", now);
    assert.equal(isOverpassHostCooled("overpass-api.de", now + 29_999), true);
    assert.equal(isOverpassHostCooled("overpass-api.de", now + 30_000), false);
    assert.equal(isOverpassHostCooled("maps.mail.ru", now), false);
  });
});
