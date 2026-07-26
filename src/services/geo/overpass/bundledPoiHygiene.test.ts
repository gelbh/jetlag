import { describe, expect, it } from "vitest";
import {
  dedupeBundledPoiPlaces,
  isEligibleBundledPoi,
  normalizeBundledPoiName,
} from "./bundledPoiHygiene";

describe("bundledPoiHygiene", () => {
  it("normalizes park suffix noise and typos", () => {
    expect(normalizeBundledPoiName("Deering Oaks Park", "park")).toBe(
      "deering oaks",
    );
    expect(normalizeBundledPoiName("Boothby Sqaure", "park")).toBe("boothby");
  });

  it("rejects non-park street and facility names", () => {
    expect(
      isEligibleBundledPoi(
        { id: "pme:1", name: "Douglas St", lat: 43.66, lng: -70.26 },
        "park",
      ),
    ).toBe(false);
    expect(
      isEligibleBundledPoi(
        { id: "pme:2", name: "Hadlock Field", lat: 43.66, lng: -70.26 },
        "park",
      ),
    ).toBe(false);
    expect(
      isEligibleBundledPoi(
        { id: "pme:3", name: "Openspace", lat: 43.66, lng: -70.26 },
        "park",
      ),
    ).toBe(false);
    expect(
      isEligibleBundledPoi(
        { id: "Q6550921", name: "Lincoln Park", lat: 43.66, lng: -70.26 },
        "park",
      ),
    ).toBe(true);
  });

  it("dedupes exact duplicate names preferring wikidata ids", () => {
    const places = dedupeBundledPoiPlaces(
      [
        { id: "Q6550921", name: "Lincoln Park", lat: 43.6597, lng: -70.255 },
        { id: "Q123", name: "Lincoln Park", lat: 43.6598, lng: -70.2551 },
      ],
      "park",
    );
    expect(places).toHaveLength(1);
    expect(places[0]?.id).toBe("Q6550921");
  });

  it("dedupes fuzzy near-dupes within 150 m", () => {
    const places = dedupeBundledPoiPlaces(
      [
        {
          id: "Q7156907",
          name: "Payson Park",
          lat: 43.6814,
          lng: -70.2675,
        },
        {
          id: "pme:openspace:1",
          name: "Edward Payson Park",
          lat: 43.6815,
          lng: -70.2676,
        },
        {
          id: "Q5250967",
          name: "Deering Oaks Park",
          lat: 43.659,
          lng: -70.2708,
        },
        {
          id: "pme:openspace:2",
          name: "Deering Oaks",
          lat: 43.6591,
          lng: -70.2709,
        },
      ],
      "park",
    );

    expect(places.map((place) => place.name)).toEqual([
      "Payson Park",
      "Deering Oaks Park",
    ]);
  });

  it("rejects park junk and keeps legitimate named parks", () => {
    const reject = (name: string) =>
      isEligibleBundledPoi(
        { id: "Q1", name, lat: 43.66, lng: -70.26 },
        "park",
      );

    expect(reject("Boothby Square")).toBe(false);
    expect(reject("Waterglade Industrial Park")).toBe(false);
    expect(reject("Neal Dow Memorial")).toBe(false);
    expect(reject("Outdoor Gym at Pier")).toBe(false);
    expect(reject("Deering Oaks Park")).toBe(true);
    expect(reject("Tompkins Square Park")).toBe(true);
    expect(reject("Phoenix Park")).toBe(true);
    expect(reject("Gantry Plaza State Park")).toBe(true);
  });

  it("rejects hospital clinics and keeps major hospitals", () => {
    expect(
      isEligibleBundledPoi(
        { id: "Q1", name: "Blackrock Clinic", lat: 53.3, lng: -6.2 },
        "hospital",
      ),
    ).toBe(false);
    expect(
      isEligibleBundledPoi(
        { id: "Q2", name: "Great Ormond Street Hospital", lat: 51.5, lng: -0.12 },
        "hospital",
      ),
    ).toBe(true);
  });

  it("rejects museum noise and keeps named museums", () => {
    expect(
      isEligibleBundledPoi(
        { id: "Q1", name: "Irish Film Archive", lat: 53.34, lng: -6.25 },
        "museum",
      ),
    ).toBe(false);
    expect(
      isEligibleBundledPoi(
        { id: "Q2", name: "Science Gallery", lat: 53.34, lng: -6.25 },
        "museum",
      ),
    ).toBe(false);
    expect(
      isEligibleBundledPoi(
        { id: "Q3", name: "Metropolitan Museum of Art", lat: 40.78, lng: -73.96 },
        "museum",
      ),
    ).toBe(true);
    expect(
      isEligibleBundledPoi(
        { id: "Q4", name: "Guinness Storehouse", lat: 53.34, lng: -6.29 },
        "museum",
      ),
    ).toBe(true);
  });

  it("rejects private airfields and keeps commercial airports", () => {
    expect(
      isEligibleBundledPoi(
        { id: "Q1", name: "Morris Park Aerodrome", lat: 40.85, lng: -73.85 },
        "commercial_airport",
      ),
    ).toBe(false);
    expect(
      isEligibleBundledPoi(
        { id: "Q2", name: "London Heathrow Airport", lat: 51.47, lng: -0.45 },
        "commercial_airport",
      ),
    ).toBe(true);
  });

  it("keeps distant rail stations that share a name", () => {
    const places = dedupeBundledPoiPlaces(
      [
        { id: "Q1", name: "Jamaica", lat: 40.7, lng: -73.8 },
        { id: "Q2", name: "Jamaica", lat: 40.75, lng: -73.85 },
      ],
      "rail_station",
    );
    expect(places).toHaveLength(2);
  });
});
