import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyOverpassQuery } from "../proxies/postpassClassify.mjs";
import { buildPostpassSql } from "../proxies/postpassSql.mjs";
import { geoJsonToOverpassElements } from "../proxies/geoJsonToOverpassElements.mjs";

describe("postpassTranslate", () => {
  it("classifies admin QL and builds polygon SQL", () => {
    const ql = `
      [out:json][timeout:25];
      ( relation["boundary"="administrative"]["admin_level"="8"]["name"](53.2,-6.4,53.4,-6.1); );
      out center; >; out geom qt;
    `;
    const c = classifyOverpassQuery(ql);
    assert.equal(c.family, "admin");
    assert.equal(c.meta.adminLevel, "8");
    const sql = buildPostpassSql(c);
    assert.match(sql, /postpass_polygon/i);
    assert.match(sql, /admin_level/);
    assert.match(sql, /ST_MakeEnvelope/i);
    assert.equal(sql.endsWith(";"), false);
  });

  it("normalizes admin MultiPolygon to relation + outer ways", () => {
    const fc = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            osm_type: "R",
            osm_id: 42,
            tags: {
              boundary: "administrative",
              admin_level: "8",
              name: "Example",
            },
          },
          geometry: {
            type: "MultiPolygon",
            coordinates: [
              [
                [
                  [-6.3, 53.3],
                  [-6.2, 53.3],
                  [-6.2, 53.35],
                  [-6.3, 53.35],
                  [-6.3, 53.3],
                ],
              ],
            ],
          },
        },
      ],
    };
    const { elements } = geoJsonToOverpassElements(fc, "admin");
    assert.ok(elements.some((e) => e.type === "relation" && e.id === 42));
    assert.ok(elements.some((e) => e.type === "way" && e.geometry?.length >= 4));
  });

  it("classifies places QL", () => {
    const ql = `
      [out:json][timeout:25];
      ( node["amenity"="cafe"](53.3,-6.3,53.4,-6.2); );
      out center 200;
    `;
    const c = classifyOverpassQuery(ql);
    assert.equal(c.family, "places");
    const sql = buildPostpassSql(c);
    assert.match(sql, /postpass_point/i);
    assert.match(sql, /ST_MakeEnvelope/i);
    assert.match(sql, /amenity/);
  });

  it("classifies around QL with DWithin", () => {
    const ql = `
      [out:json][timeout:25];
      ( node(around:1609.344,51.5,-0.12)["amenity"="cafe"]; );
      out center 40;
    `;
    const c = classifyOverpassQuery(ql);
    assert.equal(c.family, "around");
    const sql = buildPostpassSql(c);
    assert.match(sql, /postpass_point/i);
    assert.match(sql, /ST_DWithin/i);
  });

  it("classifies metro QL", () => {
    const ql = `
      [out:json][timeout:25];
      ( relation(around:1609,51.5,-0.12)["route"~"subway|light_rail|tram|monorail"]["name"]; );
      out center 40;
    `;
    const c = classifyOverpassQuery(ql);
    assert.equal(c.family, "metro");
    const sql = buildPostpassSql(c);
    assert.match(sql, /postpass_line/i);
    assert.match(sql, /ST_DWithin/i);
    assert.match(sql, /subway/);
  });

  it("classifies linear QL and normalizes LineString ways", () => {
    const ql = `
      [out:json][timeout:25];
      ( way["highway"="primary"](53.2,-6.4,53.4,-6.1); );
      out geom;
    `;
    const c = classifyOverpassQuery(ql);
    assert.equal(c.family, "linear");
    const sql = buildPostpassSql(c);
    assert.match(sql, /postpass_line/i);
    assert.match(sql, /ST_MakeEnvelope/i);
    assert.match(sql, /highway/);

    const { elements } = geoJsonToOverpassElements(
      {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              osm_type: "W",
              osm_id: 7,
              tags: { highway: "primary" },
            },
            geometry: {
              type: "LineString",
              coordinates: [
                [-6.3, 53.3],
                [-6.2, 53.31],
                [-6.1, 53.32],
              ],
            },
          },
        ],
      },
      "linear",
    );
    assert.equal(elements.length, 1);
    assert.equal(elements[0].type, "way");
    assert.equal(elements[0].geometry.length, 3);
    assert.equal(elements[0].geometry[0].lat, 53.3);
    assert.equal(elements[0].geometry[0].lon, -6.3);
  });

  it("classifies coastline QL", () => {
    const ql = `
      [out:json][timeout:25];
      way["natural"="coastline"](53.2,-6.4,53.4,-6.1);
      out geom;
    `;
    const c = classifyOverpassQuery(ql);
    assert.equal(c.family, "coastline");
    const sql = buildPostpassSql(c);
    assert.match(sql, /postpass_line/i);
    assert.match(sql, /coastline/);
    assert.match(sql, /ST_MakeEnvelope/i);
  });

  it("classifies landmass QL", () => {
    const ql = `
      [out:json][timeout:25];
      (
        way["natural"="water"](53.2,-6.4,53.4,-6.1);
        way["waterway"~"^(river|canal|dock)$"](53.2,-6.4,53.4,-6.1);
        relation["place"~"^(island|islet)$"]["name"](53.2,-6.4,53.4,-6.1);
      );
      out geom;
    `;
    const c = classifyOverpassQuery(ql);
    assert.equal(c.family, "landmass");
    const sql = buildPostpassSql(c);
    assert.match(sql, /postpass_line/i);
    assert.match(sql, /postpass_polygon/i);
    assert.match(sql, /ST_MakeEnvelope/i);
  });
});
