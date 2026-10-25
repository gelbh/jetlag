import { type BoundingBox, gameAreaToBoundingBox } from "@/domain/geometry/gameArea/gameAreaBounds";
import type { GameArea } from "@/domain/map/annotations";
import { queryOverpass } from "../../core/overpass/overpassClient";
import { formatOverpassBbox, OVERPASS_JSON_QUERY_HEADER } from "./queryHelpers";

export type PlayAreaCategoryPresenceSpec = {
  id: string;
  selectors: string[];
};

type OverpassCountElement = {
  type: string;
  tags?: Record<string, string | number>;
};

type OverpassCountPayload = {
  remark?: string;
  elements?: OverpassCountElement[];
};

function emittedSpecs(
  specs: readonly PlayAreaCategoryPresenceSpec[],
): PlayAreaCategoryPresenceSpec[] {
  return specs.filter((spec) => spec.selectors.length > 0);
}

function buildCategoryStatements(bbox: string, selectors: readonly string[]): string {
  if (selectors.length === 1) {
    return `nwr${selectors[0]}(${bbox});\nout count;`;
  }

  const clauses = selectors.map((selector) => `nwr${selector}(${bbox});`).join("\n  ");
  return `(\n  ${clauses}\n);\nout count;`;
}

export function buildPlayAreaCategoryPresenceQuery(
  bounds: BoundingBox,
  specs: readonly PlayAreaCategoryPresenceSpec[],
): string {
  const bbox = formatOverpassBbox(bounds);
  const body = emittedSpecs(specs)
    .map((spec) => buildCategoryStatements(bbox, spec.selectors))
    .join("\n");

  return `${OVERPASS_JSON_QUERY_HEADER}\n${body}`;
}

function isOverpassRuntimeRemark(remark: string): boolean {
  const normalized = remark.toLowerCase();
  return (
    normalized.includes("runtime error") ||
    normalized.includes("timed out") ||
    normalized.includes("timeout")
  );
}

function parseCountTotal(element: OverpassCountElement): number {
  const tags = element.tags ?? {};
  if (tags.total !== undefined) {
    const total = Number(tags.total);
    if (Number.isFinite(total)) {
      return total;
    }
  }

  const nodes = Number(tags.nodes ?? 0);
  const ways = Number(tags.ways ?? 0);
  const relations = Number(tags.relations ?? 0);
  return (
    (Number.isFinite(nodes) ? nodes : 0) +
    (Number.isFinite(ways) ? ways : 0) +
    (Number.isFinite(relations) ? relations : 0)
  );
}

export async function probePlayAreaCategoryCounts(
  gameArea: GameArea,
  specs: readonly PlayAreaCategoryPresenceSpec[],
): Promise<Record<string, number>> {
  const active = emittedSpecs(specs);
  if (active.length === 0) {
    return {};
  }

  const ql = buildPlayAreaCategoryPresenceQuery(gameAreaToBoundingBox(gameArea), specs);
  const payload = await queryOverpass<OverpassCountPayload>(ql);

  if (typeof payload.remark === "string" && isOverpassRuntimeRemark(payload.remark)) {
    throw new Error(`Overpass presence probe failed: ${payload.remark}`);
  }

  const countElements = (payload.elements ?? []).filter((element) => element.type === "count");
  if (countElements.length !== active.length) {
    throw new Error(
      `Overpass presence probe returned incomplete counts (expected ${active.length}, got ${countElements.length}).`,
    );
  }

  const counts: Record<string, number> = {};
  for (let index = 0; index < active.length; index += 1) {
    const spec = active[index];
    const element = countElements[index];
    if (!spec || !element) {
      throw new Error("Overpass presence probe returned incomplete counts.");
    }
    counts[spec.id] = parseCountTotal(element);
  }

  return counts;
}
