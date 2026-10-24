import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** @param {number[]} values */
const median = (values) => {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** @param {string} dir */
export function readLhrs(dir) {
  let names;
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((name) => name.endsWith(".report.json"))
    .map((name) => JSON.parse(readFileSync(join(dir, name), "utf8")));
}

/**
 * @param {{ model: string, cores: number, lhrs: any[], runnerClass?: string }} input
 */
export function summarizeRunner({ model, cores, lhrs, runnerClass }) {
  const bi = median(lhrs.map((lhr) => lhr.environment.benchmarkIndex));
  const byRoute = new Map();
  for (const lhr of lhrs) {
    const path = new URL(lhr.finalUrl).pathname;
    byRoute.set(path, [...(byRoute.get(path) ?? []), lhr.categories.performance.score]);
  }
  const rows = [
    `| cpu | ${model} |`,
    `| cores | ${cores} |`,
    ...(runnerClass ? [`| class | ${runnerClass} |`] : []),
    `| median benchmarkIndex | ${bi === undefined ? "n/a" : Math.round(bi)} |`,
    ...[...byRoute]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, scores]) => `| \`${path}\` | ${Number(median(scores).toFixed(3))} |`),
  ];
  return ["### Lighthouse runner (mobile)", "", "| | |", "|---|---|", ...rows, ""].join("\n");
}
