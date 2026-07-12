import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCtaBusVehicles,
  normalizeCtaTrainVehicles,
} from "../proxies/ctaProxy.mjs";

const BOUNDS = {
  south: 41.64,
  west: -87.94,
  north: 42.07,
  east: -87.52,
};

describe("ctaProxy", () => {
  it("normalizes CTA bus vehicles within bounds", () => {
    const vehicles = normalizeCtaBusVehicles(
      {
        "bustime-response": {
          vehicle: [
            {
              vid: "100",
              lat: "41.8781",
              lon: "-87.6298",
              hdg: "90",
              rt: "20",
              des: "Michigan",
            },
            {
              vid: "200",
              lat: "40.0",
              lon: "-88.0",
              rt: "1",
            },
          ],
        },
      },
      BOUNDS,
    );

    assert.equal(vehicles.length, 1);
    assert.equal(vehicles[0]?.id, "100");
    assert.equal(vehicles[0]?.mode, "bus");
    assert.equal(vehicles[0]?.routeRef, "20");
  });

  it("normalizes CTA train vehicles within bounds", () => {
    const vehicles = normalizeCtaTrainVehicles(
      {
        ctatt: {
          errCd: "0",
          route: [
            {
              "@name": "red",
              train: [
                {
                  rn: "123",
                  lat: "41.89",
                  lon: "-87.63",
                  heading: "180",
                  destNm: "Howard",
                },
                {
                  rn: "124",
                  lat: "40.0",
                  lon: "-88.0",
                  destNm: "Far",
                },
              ],
            },
          ],
        },
      },
      BOUNDS,
    );

    assert.equal(vehicles.length, 1);
    assert.equal(vehicles[0]?.id, "123");
    assert.equal(vehicles[0]?.mode, "metro");
    assert.equal(vehicles[0]?.routeRef, "red");
  });
});
