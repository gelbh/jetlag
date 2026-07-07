import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseBoundingBoxQuery,
  parseOverpassQueryBody,
  parseTransitlandFeedQuery,
  parseVehiclesMetroQuery,
} from "../proxyValidation.mjs";

describe("proxyValidation", () => {
  it("parses bounding boxes", () => {
    const result = parseBoundingBoxQuery({
      south: "53.1",
      west: "-6.4",
      north: "53.4",
      east: "-6.1",
    });

    assert.equal(result.ok, true);
    assert.equal(result.value.north, 53.4);
  });

  it("rejects invalid bounding boxes", () => {
    const result = parseBoundingBoxQuery({
      south: "bad",
      west: "-6.4",
      north: "53.4",
      east: "-6.1",
    });

    assert.equal(result.ok, false);
  });

  it("parses supported vehicle metros", () => {
    assert.deepEqual(parseVehiclesMetroQuery({ metro: "london" }), {
      ok: true,
      value: "london",
    });
    assert.equal(parseVehiclesMetroQuery({ metro: "paris" }).ok, false);
  });

  it("parses transitland feeds", () => {
    assert.deepEqual(parseTransitlandFeedQuery({ feed: "f-dr5r-nyct~rt" }), {
      ok: true,
      value: "f-dr5r-nyct~rt",
    });
    assert.equal(parseTransitlandFeedQuery({ feed: "" }).ok, false);
  });

  it("parses overpass query bodies", () => {
    assert.deepEqual(parseOverpassQueryBody({ query: "[out:json];node(1);out;" }), {
      ok: true,
      value: "[out:json];node(1);out;",
    });
    assert.equal(parseOverpassQueryBody({ query: "" }).ok, false);
  });
});
