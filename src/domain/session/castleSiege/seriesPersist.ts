import type { SeriesOutcome, SeriesScore, SeriesState } from "./seriesScore";

export type SerializedSeriesFields = {
  gameIndex: number;
  score: SeriesScore;
  seriesOutcome?: SeriesOutcome;
};

export type DeserializedSeriesFields = {
  gameIndex: number;
  score: SeriesScore;
  seriesOutcome: SeriesOutcome | null;
};

const OUTCOMES = new Set<SeriesOutcome>(["complete", "abandoned"]);

function isNonNegInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

/** Firestore patch fragment; omits null seriesOutcome. */
export function serializeSeriesFields(
  state: Pick<SeriesState, "gameIndex" | "score" | "seriesOutcome">,
): SerializedSeriesFields {
  const payload: SerializedSeriesFields = {
    gameIndex: state.gameIndex,
    score: { teamA: state.score.teamA, teamB: state.score.teamB },
  };
  if (state.seriesOutcome !== null) {
    payload.seriesOutcome = state.seriesOutcome;
  }
  return payload;
}

export function deserializeSeriesFields(value: unknown): DeserializedSeriesFields | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (!isNonNegInt(record.gameIndex) || record.gameIndex < 1) {
    return undefined;
  }
  const scoreRaw = record.score;
  if (!scoreRaw || typeof scoreRaw !== "object" || Array.isArray(scoreRaw)) {
    return undefined;
  }
  const scoreMap = scoreRaw as Record<string, unknown>;
  if (!isNonNegInt(scoreMap.teamA) || !isNonNegInt(scoreMap.teamB)) {
    return undefined;
  }

  let seriesOutcome: SeriesOutcome | null = null;
  if (record.seriesOutcome !== undefined && record.seriesOutcome !== null) {
    if (
      typeof record.seriesOutcome !== "string" ||
      !OUTCOMES.has(record.seriesOutcome as SeriesOutcome)
    ) {
      return undefined;
    }
    seriesOutcome = record.seriesOutcome as SeriesOutcome;
  }

  return {
    gameIndex: record.gameIndex,
    score: { teamA: scoreMap.teamA, teamB: scoreMap.teamB },
    seriesOutcome,
  };
}
