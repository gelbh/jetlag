/**
 * @param {string} value
 * @returns {string}
 */
function sqlStringLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Overpass `~` is an unanchored POSIX regex match.
 *
 * @param {import("./postpassClassify.mjs").OverpassFilter} pred
 * @returns {string}
 */
export function tagPredicateSql(pred) {
  const key = sqlStringLiteral(pred.key);
  switch (pred.op) {
    case "exists":
      return `tags ? ${key}`;
    case "eq":
      return `tags->>${key} = ${sqlStringLiteral(pred.value)}`;
    case "regex":
      return `tags->>${key} ~ ${sqlStringLiteral(pred.value)}`;
    case "iregex":
      return `tags->>${key} ~* ${sqlStringLiteral(pred.value)}`;
    default: {
      const _exhaustive = pred.op;
      throw new Error(`Unsupported Postpass tag op: ${_exhaustive}`);
    }
  }
}

/**
 * @param {unknown} clauses
 * @param {string} family
 * @returns {string}
 */
function clausesSql(clauses, family) {
  if (!Array.isArray(clauses) || clauses.length === 0) {
    throw new Error(`Postpass ${family} SQL requires clauses.`);
  }
  return `(${clauses.map((clause) => `(${clause.map(tagPredicateSql).join(" AND ")})`).join(" OR ")})`;
}

/**
 * @param {{ south: number, west: number, north: number, east: number }} bbox
 * @returns {string}
 */
export function envelopeSql(bbox) {
  return `ST_MakeEnvelope(${bbox.west}, ${bbox.south}, ${bbox.east}, ${bbox.north}, 4326)`;
}

/**
 * @param {{ radiusMeters: number, lat: number, lon: number }} around
 * @returns {string}
 */
export function dwithinSql(around) {
  const point = `ST_SetSRID(ST_MakePoint(${around.lon}, ${around.lat}), 4326)`;
  // Degree box covering the radius so the geom index can prefilter; geography cast cannot use it.
  const cosLat = Math.max(Math.cos((around.lat * Math.PI) / 180), 0.01);
  const degrees = around.radiusMeters / (111_320 * cosLat);
  return `geom && ST_Expand(${point}, ${degrees}) AND ST_DWithin(geom::geography, ${point}::geography, ${around.radiusMeters})`;
}

const POINT_ON_SURFACE_GEOM = "ST_PointOnSurface(geom) AS geom";

/**
 * @param {string} table
 * @param {string[]} wheres
 * @param {number} [limit]
 * @param {string} [geomSql]
 * @returns {string}
 */
function selectSql(table, wheres, limit, geomSql = "geom") {
  const where = wheres.length > 0 ? ` WHERE ${wheres.join(" AND ")}` : "";
  const lim = limit != null ? ` LIMIT ${limit}` : "";
  return `SELECT osm_id, osm_type, tags, ${geomSql} FROM ${table}${where}${lim}`;
}

/**
 * @param {{ family: string, meta: Record<string, unknown> }} classification
 * @returns {string}
 */
export function buildPostpassSql(classification) {
  const { family, meta } = classification;
  const bbox = meta.bbox;
  const around = meta.around;

  switch (family) {
    case "admin": {
      if (!bbox) {
        throw new Error("Postpass admin SQL requires bbox.");
      }
      const wheres = [
        `tags->>'boundary' = 'administrative'`,
        meta.adminLevel != null
          ? `tags->>'admin_level' = ${sqlStringLiteral(String(meta.adminLevel))}`
          : `tags ? 'admin_level'`,
        `geom && ${envelopeSql(bbox)}`,
      ];
      return selectSql("postpass_polygon", wheres);
    }
    case "coastline": {
      if (!bbox) {
        throw new Error("Postpass coastline SQL requires bbox.");
      }
      return selectSql("postpass_line", [
        `tags->>'natural' = 'coastline'`,
        `geom && ${envelopeSql(bbox)}`,
      ]);
    }
    case "landmass": {
      // Closed water (lakes) lives on postpass_polygon; rivers on postpass_line.
      // Islands are polygons with place=island|islet.
      if (!bbox) {
        throw new Error("Postpass landmass SQL requires bbox.");
      }
      const env = envelopeSql(bbox);
      const waterwayLine = selectSql("postpass_line", [
        `tags->>'waterway' ~ '^(river|canal|dock)$'`,
        `geom && ${env}`,
      ]);
      const waterPoly = selectSql("postpass_polygon", [
        `tags->>'natural' = 'water'`,
        `geom && ${env}`,
      ]);
      const islandPoly = selectSql("postpass_polygon", [
        `tags->>'place' ~ '^(island|islet)$'`,
        `geom && ${env}`,
      ]);
      return [waterwayLine, waterPoly, islandPoly].join(" UNION ALL ");
    }
    case "metro": {
      const wheres = [`tags->>'route' ~ '^(subway|light_rail|tram|monorail)$'`];
      if (around) {
        wheres.push(dwithinSql(around));
      } else if (bbox) {
        wheres.push(`geom && ${envelopeSql(bbox)}`);
      } else {
        throw new Error("Postpass metro SQL requires around or bbox.");
      }
      return selectSql("postpass_line", wheres, 40);
    }
    case "around": {
      if (!around) {
        throw new Error("Postpass around SQL requires around.");
      }
      return selectSql(
        "postpass_pointlinepolygon",
        [clausesSql(meta.clauses, family), dwithinSql(around)],
        40,
        POINT_ON_SURFACE_GEOM,
      );
    }
    case "linear": {
      if (!bbox) {
        throw new Error("Postpass linear SQL requires bbox.");
      }
      return selectSql("postpass_line", [
        clausesSql(meta.clauses, family),
        `geom && ${envelopeSql(bbox)}`,
      ]);
    }
    case "places": {
      const wheres = [clausesSql(meta.clauses, family)];
      if (bbox) {
        wheres.push(`geom && ${envelopeSql(bbox)}`);
      } else if (around) {
        wheres.push(dwithinSql(around));
      } else {
        throw new Error("Postpass places SQL requires bbox or around.");
      }
      return selectSql("postpass_pointlinepolygon", wheres, 200, POINT_ON_SURFACE_GEOM);
    }
    default: {
      const _exhaustive = family;
      throw new Error(`Unsupported Postpass family: ${_exhaustive}`);
    }
  }
}
