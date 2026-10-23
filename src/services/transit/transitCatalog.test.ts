import { describe, expect, it } from "vitest";
import { metroSupportsLiveVehicles, TRANSIT_METROS } from "./transitCatalog";

describe("transitCatalog", () => {
  it("enables live vehicles for metros with RT feeds", () => {
    const london = TRANSIT_METROS.find((metro) => metro.id === "london");
    const nyc = TRANSIT_METROS.find((metro) => metro.id === "nyc");
    const dublin = TRANSIT_METROS.find((metro) => metro.id === "dublin");
    const sf = TRANSIT_METROS.find((metro) => metro.id === "sf");
    const chicago = TRANSIT_METROS.find((metro) => metro.id === "chicago");

    expect(metroSupportsLiveVehicles(london ?? null)).toBe(true);
    expect(metroSupportsLiveVehicles(nyc ?? null)).toBe(true);
    expect(metroSupportsLiveVehicles(dublin ?? null)).toBe(true);
    expect(metroSupportsLiveVehicles(sf ?? null)).toBe(true);
    expect(metroSupportsLiveVehicles(chicago ?? null)).toBe(true);
  });

  it("routes Chicago live vehicles through the vehicles proxy", () => {
    const chicago = TRANSIT_METROS.find((metro) => metro.id === "chicago");
    expect(chicago?.vehiclesProxyMetro).toBe("chicago");
    expect(chicago?.transitlandRtFeed).toBeUndefined();
  });

  it("wires Transitland RT feed IDs for Dublin and SF", () => {
    const dublin = TRANSIT_METROS.find((metro) => metro.id === "dublin");
    const sf = TRANSIT_METROS.find((metro) => metro.id === "sf");

    expect(dublin?.transitlandRtFeed).toBe("f-national~transport~authority~ie~rt");
    expect(sf?.transitlandRtFeed).toBe("f-sf~bay~area~rg~rt");
  });

  it("registers southampton as static-only (no RT)", () => {
    const southampton = TRANSIT_METROS.find((m) => m.id === "southampton");
    expect(southampton?.transitlandFeed).toBeTruthy();
    expect(southampton?.transitlandRtFeed).toBeUndefined();
    expect(metroSupportsLiveVehicles(southampton ?? null)).toBe(false);
  });

  it("registers sydney as static-only (no RT)", () => {
    const sydney = TRANSIT_METROS.find((m) => m.id === "sydney");
    expect(sydney?.transitlandFeed).toBeTruthy();
    expect(sydney?.transitlandRtFeed).toBeUndefined();
    expect(metroSupportsLiveVehicles(sydney ?? null)).toBe(false);
  });
});
