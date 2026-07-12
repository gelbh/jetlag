import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTflPayload } from "../proxies/tflNormalize.mjs";

test("normalizeTflPayload filters vehicles outside bounds", () => {
  const bounds = { south: 51.4, west: -0.2, north: 51.6, east: 0.1 };
  const payload = {
    vehiclePositions: [
      {
        vehicleId: "in",
        lineName: "Central",
        location: { latitude: 51.5, longitude: 0 },
      },
      {
        vehicleId: "out",
        lineName: "District",
        location: { latitude: 52, longitude: 0 },
      },
    ],
  };

  const result = normalizeTflPayload(payload, bounds);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "in");
  assert.equal(result[0].label, "Central");
});
