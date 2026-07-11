import type { GameArea } from "../../domain/map/annotations";
import { gameAreaToBoundingBox } from "../../domain/geometry/gameAreaBounds";
import {
  MEASURING_CATALOG,
  measuringLinearOverpassSelectors,
  measuringLocationOverpassSelectors,
  type MeasuringFromKind,
  type MeasuringLocationCategory,
} from "../../domain/questions";
import {
  formatOverpassBboxFromGameArea,
  overpassQueryTemplate,
  overpassTaggedBboxClauses,
} from "./query";

export function auditAdminDivisionQuery(
  gameArea: GameArea,
  adminLevel: number,
): string {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);

  return `
    [out:json][timeout:45][bbox:${south},${west},${north},${east}];
    area.searchArea;
    (
      relation(area.searchArea)["boundary"="administrative"]["admin_level"="${adminLevel}"]["name"];
    );
    out center;
    >;
    out geom qt;
  `;
}

export function auditLandmassQuery(gameArea: GameArea): string {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);

  return `
    [out:json][timeout:45][bbox:${south},${west},${north},${east}];
    area.searchArea;
    (
      way(area.searchArea)["natural"="water"];
      way(area.searchArea)["waterway"~"^(river|canal|stream|ditch|dock)$"];
      relation(area.searchArea)["place"~"^(island|islet)$"]["name"];
    );
    out center;
    >;
    out geom qt;
  `;
}

export function auditCoastlineQuery(gameArea: GameArea): string {
  const bbox = formatOverpassBboxFromGameArea(gameArea);

  return overpassQueryTemplate(`
    way["natural"="coastline"](${bbox});
    out geom;
  `);
}

export function auditMeasuringPlacesQuery(
  gameArea: GameArea,
  selectors: readonly string[],
): string {
  const bbox = formatOverpassBboxFromGameArea(gameArea);
  const clauses = overpassTaggedBboxClauses(bbox, selectors);

  return overpassQueryTemplate(`
  (
    ${clauses.join("\n    ")}
  );
  out center 200;
  `);
}

export function auditLinearFeaturesQuery(
  gameArea: GameArea,
  selectors: readonly string[],
): string {
  const { south, west, north, east } = gameAreaToBoundingBox(gameArea);
  const bbox = `${south},${west},${north},${east}`;
  const clauses = selectors.map((selector) => `way${selector}(${bbox});`);

  return `
    [out:json][timeout:25];
  (
    ${clauses.join("\n    ")}
  );
  out geom;
  `;
}

export function auditStaticTransitStopsQuery(
  bounds: ReturnType<typeof gameAreaToBoundingBox>,
): string {
  const { south, west, north, east } = bounds;

  return `
    [out:json][timeout:25];
    (
      node["railway"="station"](${south},${west},${north},${east});
      node["railway"="halt"](${south},${west},${north},${east});
      node["public_transport"="stop_position"](${south},${west},${north},${east});
      node["highway"="bus_stop"](${south},${west},${north},${east});
      node["railway"="tram_stop"](${south},${west},${north},${east});
    );
    out body 250;
  `;
}

export function auditStaticTransitRoutesQuery(
  bounds: ReturnType<typeof gameAreaToBoundingBox>,
): string {
  const { south, west, north, east } = bounds;

  return `
    [out:json][timeout:25];
    (
      way["railway"~"rail|subway|light_rail|tram"](${south},${west},${north},${east});
    );
    out body geom 80;
  `;
}

const AUDIT_LINEAR_KINDS: MeasuringFromKind[] = [
  "high_speed_rail_line",
  "international_border",
  "admin1_border",
  "admin2_border",
  "mountain",
];

const AUDIT_ADMIN_LEVELS = [4, 6, 8] as const;

export interface OverpassAuditCase {
  id: string;
  tool: string;
  query: string;
}

export function buildOverpassAuditCases(gameArea: GameArea): OverpassAuditCase[] {
  const cases: OverpassAuditCase[] = [];

  for (const adminLevel of AUDIT_ADMIN_LEVELS) {
    cases.push({
      id: `admin:${adminLevel}`,
      tool: "admin",
      query: auditAdminDivisionQuery(gameArea, adminLevel),
    });
  }

  cases.push({
    id: "landmass",
    tool: "landmass",
    query: auditLandmassQuery(gameArea),
  });

  cases.push({
    id: "coastline",
    tool: "measuring",
    query: auditCoastlineQuery(gameArea),
  });

  for (const option of MEASURING_CATALOG) {
    if (option.subject === "coastline" || option.subject === "sea_level") {
      continue;
    }

    const selectors = measuringLocationOverpassSelectors(
      option.id as MeasuringLocationCategory,
    );
    if (selectors.length === 0) {
      continue;
    }

    cases.push({
      id: `measuring:place:${option.id}`,
      tool: "measuring",
      query: auditMeasuringPlacesQuery(gameArea, selectors),
    });
  }

  for (const kind of AUDIT_LINEAR_KINDS) {
    const selectors = measuringLinearOverpassSelectors(kind);
    if (selectors.length === 0) {
      continue;
    }

    cases.push({
      id: `measuring:linear:${kind}`,
      tool: "measuring",
      query: auditLinearFeaturesQuery(gameArea, selectors),
    });
  }

  const bounds = gameAreaToBoundingBox(gameArea);
  cases.push({
    id: "transit:stops",
    tool: "transit",
    query: auditStaticTransitStopsQuery(bounds),
  });
  cases.push({
    id: "transit:routes",
    tool: "transit",
    query: auditStaticTransitRoutesQuery(bounds),
  });

  return cases;
}
