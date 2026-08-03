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
      const wheres = [
        `tags->>'boundary' = 'administrative'`,
        meta.adminLevel != null
          ? `tags->>'admin_level' = ${sqlStringLiteral(String(meta.adminLevel))}`
          : `tags ? 'admin_level'`,
      ];
      if (bbox) {
        wheres.push(`geom && ${envelopeSql(bbox)}`);
      }
      return selectSql("postpass_polygon", wheres);
    }
    case "coastline": {
      const wheres = [`tags->>'natural' = 'coastline'`];
      if (bbox) {
        wheres.push(`geom && ${envelopeSql(bbox)}`);
      }
      return selectSql("postpass_line", wheres);
    }
    case "landmass": {
      // Prefer polygon islands; waterways also hit line table via a second query
      // is out of scope for single-SQL v1 — polygon + line water tags on polygon table
      // miss rivers. Emit line query covering water/waterway; islands via place tags
      // use polygon. Combined via UNION ALL.
      const lineWheres = [
        `(tags->>'natural' = 'water' OR tags->>'waterway' ~ '^(river|canal|dock)$')`,
      ];
      const polyWheres = [`tags->>'place' ~ '^(island|islet)$'`];
      if (bbox) {
        const env = envelopeSql(bbox);
        lineWheres.push(`geom && ${env}`);
        polyWheres.push(`geom && ${env}`);
      }
      return [
        selectSql("postpass_line", lineWheres),
        selectSql("postpass_polygon", polyWheres),
      ].join(" UNION ALL ");
    }
    case "metro": {
      const wheres = [
        `tags->>'route' ~ '^(subway|light_rail|tram|monorail)$'`,
      ];
      if (around) {
        wheres.push(dwithinSql(around));
      } else if (bbox) {
        wheres.push(`geom && ${envelopeSql(bbox)}`);
      }
      return selectSql("postpass_line", wheres, 40);
    }
    case "around": {
      const wheres = tagWhereClauses(tags);
      if (around) {
        wheres.push(dwithinSql(around));
      }
      return selectSql("postpass_point", wheres, 40);
    }
    case "linear": {
      const wheres = tagWhereClauses(tags);
      if (bbox) {
        wheres.push(`geom && ${envelopeSql(bbox)}`);
      }
      return selectSql("postpass_line", wheres);
    }
    case "places": {
      const wheres = tagWhereClauses(tags);
      if (bbox) {
        wheres.push(`geom && ${envelopeSql(bbox)}`);
      } else if (around) {
        wheres.push(dwithinSql(around));
      }
      return selectSql("postpass_point", wheres, 200);
    }
    default: {
      const _exhaustive = family;
      throw new Error(`Unsupported Postpass family: ${_exhaustive}`);
    }
  }
}
