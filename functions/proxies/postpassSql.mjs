/**
 * @param {string} value
 * @returns {string}
 */
function sqlStringLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * @param {{ key: string, op: "eq" | "regex", value: string }} pred
 * @returns {string}
 */
export function tagPredicateSql(pred) {
  const key = sqlStringLiteral(pred.key);
  if (pred.op === "regex") {
    return `tags->>${key} ~ ${sqlStringLiteral(`^(${pred.value})$`)}`;
  }
  return `tags->>${key} = ${sqlStringLiteral(pred.value)}`;
}

/**
 * @param {Array<{ key: string, op: "eq" | "regex", value: string }>} tags
 * @param {string[]} [skipKeys]
 * @returns {string[]}
 */
function tagWhereClauses(tags, skipKeys = []) {
  const skip = new Set(skipKeys);
  return tags
    .filter((pred) => !skip.has(pred.key))
    .map((pred) => tagPredicateSql(pred));
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
  return `ST_DWithin(geom::geography, ST_MakePoint(${around.lon}, ${around.lat})::geography, ${around.radiusMeters})`;
}

/**
 * @param {string} table
 * @param {string[]} wheres
 * @param {number} [limit]
 * @returns {string}
 */
function selectSql(table, wheres, limit) {
  const where =
    wheres.length > 0 ? ` WHERE ${wheres.join(" AND ")}` : "";
  const lim = limit != null ? ` LIMIT ${limit}` : "";
  return `SELECT osm_id, osm_type, tags, geom FROM ${table}${where}${lim}`;
}

/**
 * @param {{ family: string, meta: Record<string, unknown> }} classification
 * @returns {string}
 */
export function buildPostpassSql(classification) {
  const { family, meta } = classification;
  const tags = Array.isArray(meta.tags) ? meta.tags : [];
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
      const wheres = [
        `tags->>'route' ~ '^(subway|light_rail|tram|monorail)$'`,
      ];
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
      const wheres = [...tagWhereClauses(tags), dwithinSql(around)];
      return selectSql("postpass_point", wheres, 40);
    }
    case "linear": {
      if (!bbox) {
        throw new Error("Postpass linear SQL requires bbox.");
      }
      return selectSql("postpass_line", [
        ...tagWhereClauses(tags),
        `geom && ${envelopeSql(bbox)}`,
      ]);
    }
    case "places": {
      const wheres = tagWhereClauses(tags);
      if (bbox) {
        wheres.push(`geom && ${envelopeSql(bbox)}`);
      } else if (around) {
        wheres.push(dwithinSql(around));
      } else {
        throw new Error("Postpass places SQL requires bbox or around.");
      }
      return selectSql("postpass_point", wheres, 200);
    }
    default: {
      const _exhaustive = family;
      throw new Error(`Unsupported Postpass family: ${_exhaustive}`);
    }
  }
}
