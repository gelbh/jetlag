/**
 * Normalize Postpass GeoJSON FeatureCollection → Overpass-shaped `{ elements }`.
 */

let nextSyntheticWayId = -1;

function takeSyntheticWayId() {
  const id = nextSyntheticWayId;
  nextSyntheticWayId -= 1;
  return id;
}

/**
 * @param {unknown} tags
 * @returns {Record<string, string>}
 */
function normalizeTags(tags) {
  if (tags == null || typeof tags !== "object" || Array.isArray(tags)) {
    return {};
  }
  /** @type {Record<string, string>} */
  const out = {};
  for (const [key, value] of Object.entries(tags)) {
    if (value == null) continue;
    out[String(key)] = String(value);
  }
  return out;
}

/**
 * @param {Record<string, unknown>} properties
 * @returns {{ type: "node" | "way" | "relation", id: number }}
 */
function osmIdentity(properties) {
  const rawType = String(properties.osm_type ?? properties.type ?? "N").toUpperCase();
  const type =
    rawType === "W" || rawType === "WAY"
      ? "way"
      : rawType === "R" || rawType === "RELATION"
        ? "relation"
        : "node";
  const id = Number(properties.osm_id ?? properties.id ?? 0);
  return { type, id: Number.isFinite(id) ? id : 0 };
}

/**
 * @param {number[]} ring lon/lat pairs as [lon,lat]…
 * @returns {Array<{ lat: number, lon: number }>}
 */
function ringToGeometry(ring) {
  if (!Array.isArray(ring)) {
    return [];
  }
  return ring
    .filter((coord) => Array.isArray(coord) && coord.length >= 2)
    .map(([lon, lat]) => ({ lat: Number(lat), lon: Number(lon) }))
    .filter((n) => Number.isFinite(n.lat) && Number.isFinite(n.lon));
}

/**
 * @param {GeoJSON.Geometry | null | undefined} geometry
 * @returns {{ lat: number, lon: number } | null}
 */
function geometryCentroid(geometry) {
  if (!geometry) {
    return null;
  }
  if (geometry.type === "Point") {
    const [lon, lat] = geometry.coordinates;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }
    return { lat, lon };
  }
  if (geometry.type === "LineString") {
    const pts = ringToGeometry(geometry.coordinates);
    if (pts.length === 0) return null;
    const mid = pts[Math.floor(pts.length / 2)];
    return { lat: mid.lat, lon: mid.lon };
  }
  if (geometry.type === "MultiLineString") {
    const first = geometry.coordinates[0];
    const pts = ringToGeometry(first);
    if (pts.length === 0) return null;
    const mid = pts[Math.floor(pts.length / 2)];
    return { lat: mid.lat, lon: mid.lon };
  }
  if (geometry.type === "Polygon") {
    const pts = ringToGeometry(geometry.coordinates[0]);
    if (pts.length === 0) return null;
    let latSum = 0;
    let lonSum = 0;
    for (const p of pts) {
      latSum += p.lat;
      lonSum += p.lon;
    }
    return { lat: latSum / pts.length, lon: lonSum / pts.length };
  }
  if (geometry.type === "MultiPolygon") {
    const firstPoly = geometry.coordinates[0];
    const pts = ringToGeometry(firstPoly?.[0]);
    if (pts.length === 0) return null;
    let latSum = 0;
    let lonSum = 0;
    for (const p of pts) {
      latSum += p.lat;
      lonSum += p.lon;
    }
    return { lat: latSum / pts.length, lon: lonSum / pts.length };
  }
  return null;
}

/**
 * @param {object} feature
 * @param {string} family
 * @returns {object[]}
 */
function featureToElements(feature, family) {
  const properties =
    feature?.properties && typeof feature.properties === "object"
      ? feature.properties
      : {};
  const tags = normalizeTags(properties.tags ?? properties);
  const { type: osmType, id } = osmIdentity(properties);
  const geometry = feature?.geometry;

  if (family === "admin") {
    /** @type {object[]} */
    const elements = [];
    const rings = [];
    if (geometry?.type === "Polygon") {
      rings.push(geometry.coordinates[0]);
    } else if (geometry?.type === "MultiPolygon") {
      for (const poly of geometry.coordinates) {
        if (poly?.[0]) {
          rings.push(poly[0]);
        }
      }
    }
    /** @type {Array<{ type: string, ref: number, role: string }>} */
    const members = [];
    for (const ring of rings) {
      const wayGeom = ringToGeometry(ring);
      if (wayGeom.length < 4) continue;
      const wayId = takeSyntheticWayId();
      members.push({ type: "way", ref: wayId, role: "outer" });
      elements.push({
        type: "way",
        id: wayId,
        tags: {},
        geometry: wayGeom,
      });
    }
    const center = geometryCentroid(geometry);
    elements.unshift({
      type: "relation",
      id,
      tags: {
        boundary: "administrative",
        ...tags,
      },
      members,
      ...(center ? { center } : {}),
    });
    return elements;
  }

  if (family === "metro") {
    const center = geometryCentroid(geometry);
    return [
      {
        type: "relation",
        id: osmType === "relation" ? id : id,
        tags,
        ...(center ? { center } : {}),
      },
    ];
  }

  if (
    family === "linear" ||
    family === "coastline" ||
    family === "landmass"
  ) {
    /** @type {object[]} */
    const elements = [];
    if (geometry?.type === "LineString") {
      const wayGeom = ringToGeometry(geometry.coordinates);
      if (wayGeom.length >= 2) {
        elements.push({ type: "way", id, tags, geometry: wayGeom });
      }
    } else if (geometry?.type === "MultiLineString") {
      let part = 0;
      for (const line of geometry.coordinates) {
        const wayGeom = ringToGeometry(line);
        if (wayGeom.length < 2) continue;
        elements.push({
          type: "way",
          id: id + part,
          tags,
          geometry: wayGeom,
        });
        part += 1;
      }
    } else if (
      family === "landmass" &&
      (geometry?.type === "Polygon" || geometry?.type === "MultiPolygon")
    ) {
      const rings = [];
      if (geometry.type === "Polygon") {
        rings.push(geometry.coordinates[0]);
      } else {
        for (const poly of geometry.coordinates) {
          if (poly?.[0]) rings.push(poly[0]);
        }
      }
      /** @type {Array<{ type: string, ref: number, role: string }>} */
      const members = [];
      for (const ring of rings) {
        const wayGeom = ringToGeometry(ring);
        if (wayGeom.length < 4) continue;
        const wayId = takeSyntheticWayId();
        members.push({ type: "way", ref: wayId, role: "outer" });
        elements.push({
          type: "way",
          id: wayId,
          tags: {},
          geometry: wayGeom,
        });
      }
      elements.unshift({
        type: "relation",
        id,
        tags,
        members,
      });
    }
    return elements;
  }

  // places / around — prefer Point nodes; polygon → center node
  if (geometry?.type === "Point") {
    const [lon, lat] = geometry.coordinates;
    return [
      {
        type: "node",
        id,
        lat: Number(lat),
        lon: Number(lon),
        tags,
      },
    ];
  }

  const center = geometryCentroid(geometry);
  if (center) {
    return [
      {
        type: "node",
        id,
        lat: center.lat,
        lon: center.lon,
        center,
        tags,
      },
    ];
  }

  return [
    {
      type: osmType,
      id,
      tags,
    },
  ];
}

/**
 * @param {object} featureCollection
 * @param {string} family
 * @returns {{ elements: object[] }}
 */
export function geoJsonToOverpassElements(featureCollection, family) {
  nextSyntheticWayId = -1;
  const features = Array.isArray(featureCollection?.features)
    ? featureCollection.features
    : [];
  /** @type {object[]} */
  const elements = [];
  for (const feature of features) {
    elements.push(...featureToElements(feature, family));
  }
  return { elements };
}
