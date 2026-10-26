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
 * @param {unknown} ring
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
 * @param {object | null | undefined} geometry
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
    const pts = ringToGeometry(geometry.coordinates[0]);
    if (pts.length === 0) return null;
    const mid = pts[Math.floor(pts.length / 2)];
    return { lat: mid.lat, lon: mid.lon };
  }
  if (geometry.type === "Polygon") {
    return polygonRepresentativePoint(geometry.coordinates[0]);
  }
  if (geometry.type === "MultiPolygon") {
    const components = geometry.coordinates
      .map((polygon) => ({
        point: polygonRepresentativePoint(polygon[0]),
        area: polygonArea(polygon[0]),
      }))
      .filter((component) => component.point && component.area > 0)
      .sort((left, right) => right.area - left.area);
    if (components.length === 0) return null;
    return components[0].point;
  }
  return null;
}

function polygonArea(ring) {
  let twiceArea = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const [lon, lat] = ring[index];
    const [nextLon, nextLat] = ring[index + 1];
    twiceArea += lon * nextLat - nextLon * lat;
  }
  return Math.abs(twiceArea) / 2;
}

function polygonCentroid(ring) {
  const pts = ringToGeometry(ring);
  if (pts.length < 3) return null;
  let twiceArea = 0;
  let lat = 0;
  let lon = 0;
  for (let index = 0; index < pts.length - 1; index += 1) {
    const current = pts[index];
    const next = pts[index + 1];
    const cross = current.lon * next.lat - next.lon * current.lat;
    twiceArea += cross;
    lon += (current.lon + next.lon) * cross;
    lat += (current.lat + next.lat) * cross;
  }
  if (twiceArea === 0) return null;
  return { lat: lat / (3 * twiceArea), lon: lon / (3 * twiceArea) };
}

function pointInRing(point, ring) {
  const pts = ringToGeometry(ring);
  let inside = false;
  for (let index = 0, previous = pts.length - 1; index < pts.length; previous = index++) {
    const current = pts[index];
    const prior = pts[previous];
    const cross =
      (point.lon - current.lon) * (prior.lat - current.lat) -
      (point.lat - current.lat) * (prior.lon - current.lon);
    const withinSegment =
      Math.min(current.lon, prior.lon) <= point.lon &&
      point.lon <= Math.max(current.lon, prior.lon) &&
      Math.min(current.lat, prior.lat) <= point.lat &&
      point.lat <= Math.max(current.lat, prior.lat);
    if (Math.abs(cross) < Number.EPSILON && withinSegment) return true;
    if (current.lat > point.lat !== prior.lat > point.lat) {
      const intersection =
        ((prior.lon - current.lon) * (point.lat - current.lat)) / (prior.lat - current.lat) +
        current.lon;
      if (point.lon < intersection) inside = !inside;
    }
  }
  return inside;
}

function polygonRepresentativePoint(ring) {
  const points = ringToGeometry(ring);
  if (points.length === 0) return null;
  const centroid = polygonCentroid(ring);
  return centroid && pointInRing(centroid, ring) ? centroid : points[0];
}

/**
 * @param {object} geometry
 * @returns {unknown[]}
 */
function polygonExteriorRings(geometry) {
  if (geometry?.type === "Polygon") {
    return geometry.coordinates[0] ? [geometry.coordinates[0]] : [];
  }
  if (geometry?.type === "MultiPolygon") {
    /** @type {unknown[]} */
    const rings = [];
    for (const poly of geometry.coordinates) {
      if (poly?.[0]) rings.push(poly[0]);
    }
    return rings;
  }
  return [];
}

/**
 * @param {object} geometry
 * @param {number} relationId
 * @param {Record<string, string>} tags
 * @param {() => number} nextWayId
 * @param {{ includeCenter?: boolean }} [opts]
 * @returns {object[]}
 */
function relationFromPolygonRings(geometry, relationId, tags, nextWayId, opts = {}) {
  /** @type {object[]} */
  const elements = [];
  /** @type {Array<{ type: string, ref: number, role: string }>} */
  const members = [];
  for (const ring of polygonExteriorRings(geometry)) {
    const wayGeom = ringToGeometry(ring);
    if (wayGeom.length < 4) continue;
    const wayId = nextWayId();
    members.push({ type: "way", ref: wayId, role: "outer" });
    elements.push({
      type: "way",
      id: wayId,
      tags: {},
      geometry: wayGeom,
    });
  }
  const center = opts.includeCenter ? geometryCentroid(geometry) : null;
  elements.unshift({
    type: "relation",
    id: relationId,
    tags,
    members,
    ...(center ? { center } : {}),
  });
  return elements;
}

/**
 * @param {object} feature
 * @param {string} family
 * @param {() => number} nextWayId
 * @returns {object[]}
 */
function featureToElements(feature, family, nextWayId) {
  const properties =
    feature?.properties && typeof feature.properties === "object" ? feature.properties : {};
  const tags = normalizeTags(properties.tags != null ? properties.tags : {});
  const { id } = osmIdentity(properties);
  const geometry = feature?.geometry;

  if (family === "admin") {
    return relationFromPolygonRings(
      geometry,
      id,
      { boundary: "administrative", ...tags },
      nextWayId,
      { includeCenter: true },
    );
  }

  if (family === "metro") {
    const center = geometryCentroid(geometry);
    return [
      {
        type: "relation",
        id,
        tags,
        ...(center ? { center } : {}),
      },
    ];
  }

  if (family === "linear" || family === "coastline" || family === "landmass") {
    /** @type {object[]} */
    const elements = [];
    if (geometry?.type === "LineString") {
      const wayGeom = ringToGeometry(geometry.coordinates);
      if (wayGeom.length >= 2) {
        elements.push({ type: "way", id, tags, geometry: wayGeom });
      }
    } else if (geometry?.type === "MultiLineString") {
      for (const line of geometry.coordinates) {
        const wayGeom = ringToGeometry(line);
        if (wayGeom.length < 2) continue;
        elements.push({
          type: "way",
          id: nextWayId(),
          tags,
          geometry: wayGeom,
        });
      }
    } else if (
      family === "landmass" &&
      (geometry?.type === "Polygon" || geometry?.type === "MultiPolygon")
    ) {
      const place = tags.place;
      const isIsland = place === "island" || place === "islet";
      if (isIsland) {
        // Labels need relation/way + center; keep tagged relation.
        return relationFromPolygonRings(geometry, id, tags, nextWayId, {
          includeCenter: true,
        });
      }
      // Water obstacles: client only reads tagged ways with geometry.
      for (const ring of polygonExteriorRings(geometry)) {
        const wayGeom = ringToGeometry(ring);
        if (wayGeom.length < 4) continue;
        elements.push({
          type: "way",
          id: nextWayId(),
          tags,
          geometry: wayGeom,
        });
      }
    }
    return elements;
  }

  const { type: osmType } = osmIdentity(properties);
  const center = geometryCentroid(geometry);
  if (center) {
    return [
      {
        type: osmType,
        id,
        lat: center.lat,
        lon: center.lon,
        ...(osmType === "node" ? {} : { center }),
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
  let nextId = -1;
  const nextWayId = () => {
    const id = nextId;
    nextId -= 1;
    return id;
  };
  const features = Array.isArray(featureCollection?.features) ? featureCollection.features : [];
  /** @type {object[]} */
  const elements = [];
  for (const feature of features) {
    elements.push(...featureToElements(feature, family, nextWayId));
  }
  return { elements };
}
