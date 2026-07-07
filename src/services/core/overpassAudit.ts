import type { GameArea } from "../../domain/map/annotations";
import { gameAreaToBoundingBox } from "../../domain/geometry/gameAreaBounds";
import {
  buildOverpassAuditCases,
  type OverpassAuditCase,
} from "../overpass/auditQueries";
import {
  OVERPASS_ENDPOINTS,
  OVERPASS_USER_AGENT,
} from "../overpass/endpoints";

export type { OverpassAuditCase };
export { buildOverpassAuditCases };

export interface OverpassAuditRunResult {
  caseId: string;
  endpoint: string;
  status: number;
  latencyMs: number;
  byteSize: number;
  elementCount: number;
  timedOut: boolean;
  error?: string;
}

export interface OverpassAuditSummary {
  caseId: string;
  tool: string;
  runs: number;
  successRate: number;
  timeoutRate: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  avgByteSize: number;
  avgElementCount: number;
}

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * fraction) - 1),
  );
  return sorted[index] ?? 0;
}

export function summarizeOverpassAuditRuns(
  caseId: string,
  tool: string,
  runs: OverpassAuditRunResult[],
): OverpassAuditSummary {
  const successes = runs.filter((run) => run.status >= 200 && run.status < 300);
  const timeouts = runs.filter((run) => run.timedOut || run.status === 504);
  const latencies = successes.map((run) => run.latencyMs);

  return {
    caseId,
    tool,
    runs: runs.length,
    successRate: successes.length / runs.length,
    timeoutRate: timeouts.length / runs.length,
    latencyP50Ms: percentile(latencies, 0.5),
    latencyP95Ms: percentile(latencies, 0.95),
    avgByteSize:
      successes.reduce((sum, run) => sum + run.byteSize, 0) /
      Math.max(successes.length, 1),
    avgElementCount:
      successes.reduce((sum, run) => sum + run.elementCount, 0) /
      Math.max(successes.length, 1),
  };
}

export async function runOverpassAuditQuery(
  query: string,
  endpoint: string,
  timeoutMs: number,
): Promise<OverpassAuditRunResult> {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "User-Agent": OVERPASS_USER_AGENT,
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });

    const text = await response.text();
    const latencyMs = Date.now() - startedAt;
    const timedOut = response.status === 504;

    if (!response.ok) {
      return {
        caseId: "",
        endpoint,
        status: response.status,
        latencyMs,
        byteSize: text.length,
        elementCount: 0,
        timedOut,
        error: timedOut ? "gateway timeout" : `HTTP ${response.status}`,
      };
    }

    let elementCount = 0;
    try {
      const payload = JSON.parse(text) as { elements?: unknown[] };
      elementCount = payload.elements?.length ?? 0;
    } catch {
      return {
        caseId: "",
        endpoint,
        status: response.status,
        latencyMs,
        byteSize: text.length,
        elementCount: 0,
        timedOut: false,
        error: "invalid JSON",
      };
    }

    return {
      caseId: "",
      endpoint,
      status: response.status,
      latencyMs,
      byteSize: text.length,
      elementCount,
      timedOut: false,
    };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const aborted = error instanceof Error && error.name === "AbortError";

    return {
      caseId: "",
      endpoint,
      status: aborted ? 504 : 0,
      latencyMs,
      byteSize: 0,
      elementCount: 0,
      timedOut: aborted,
      error: aborted ? "client timeout" : String(error),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function runOverpassAuditCase(
  auditCase: OverpassAuditCase,
  options: {
    endpoint?: string;
    runs?: number;
    timeoutMs?: number;
    pauseMs?: number;
  } = {},
): Promise<OverpassAuditRunResult[]> {
  const endpoint = options.endpoint ?? OVERPASS_ENDPOINTS[0];
  const runs = options.runs ?? 1;
  const timeoutMs = options.timeoutMs ?? 45_000;
  const pauseMs = options.pauseMs ?? 1_000;
  const results: OverpassAuditRunResult[] = [];

  for (let index = 0; index < runs; index += 1) {
    const result = await runOverpassAuditQuery(
      auditCase.query,
      endpoint,
      timeoutMs,
    );
    results.push({ ...result, caseId: auditCase.id });

    if (index < runs - 1 && pauseMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, pauseMs));
    }
  }

  return results;
}

export async function runOverpassAudit(
  gameArea: GameArea,
  options: {
    endpoint?: string;
    runsPerCase?: number;
    timeoutMs?: number;
    pauseMs?: number;
    caseFilter?: (auditCase: OverpassAuditCase) => boolean;
  } = {},
): Promise<{
  cases: OverpassAuditCase[];
  runs: OverpassAuditRunResult[];
  summaries: OverpassAuditSummary[];
}> {
  const cases = buildOverpassAuditCases(gameArea).filter(
    options.caseFilter ?? (() => true),
  );
  const runs: OverpassAuditRunResult[] = [];

  for (const auditCase of cases) {
    const caseRuns = await runOverpassAuditCase(auditCase, {
      endpoint: options.endpoint,
      runs: options.runsPerCase ?? 1,
      timeoutMs: options.timeoutMs,
      pauseMs: options.pauseMs,
    });
    runs.push(...caseRuns);
  }

  const summaries = cases.map((auditCase) =>
    summarizeOverpassAuditRuns(
      auditCase.id,
      auditCase.tool,
      runs.filter((run) => run.caseId === auditCase.id),
    ),
  );

  return { cases, runs, summaries };
}

export function formatOverpassAuditReport(
  summaries: OverpassAuditSummary[],
): string {
  const header =
    "caseId\ttool\tsuccessRate\ttimeoutRate\tp50ms\tp95ms\tavgBytes\tavgElements";
  const rows = summaries
    .sort(
      (left, right) =>
        right.timeoutRate - left.timeoutRate ||
        right.latencyP95Ms - left.latencyP95Ms,
    )
    .map(
      (summary) =>
        `${summary.caseId}\t${summary.tool}\t${summary.successRate.toFixed(2)}\t${summary.timeoutRate.toFixed(2)}\t${summary.latencyP50Ms}\t${summary.latencyP95Ms}\t${Math.round(summary.avgByteSize)}\t${Math.round(summary.avgElementCount)}`,
    );

  return [header, ...rows].join("\n");
}

// Re-export for callers that need bbox without pulling leaflet.
export { gameAreaToBoundingBox };
