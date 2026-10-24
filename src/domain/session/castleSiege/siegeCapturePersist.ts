import {
  createIdleSiegeCapture,
  type SiegeCaptureState,
  type SiegeCaptureStatus,
} from "./siegeCapture";
import type { StandoffTeamId } from "./standoffTurn";

const STATUSES = new Set<SiegeCaptureStatus>([
  "idle",
  "pending",
  "confirmed",
  "timeout",
  "disputed",
]);
const TEAMS = new Set<StandoffTeamId>(["teamA", "teamB"]);

export function serializeSiegeCapture(capture: SiegeCaptureState): Record<string, unknown> {
  return {
    status: capture.status,
    attackingTeamId: capture.attackingTeamId,
    submittedByUid: capture.submittedByUid,
    photoStoragePath: capture.photoStoragePath,
    submittedAtMs: capture.submittedAtMs,
    confirmDeadlineMs: capture.confirmDeadlineMs,
    resolvedAtMs: capture.resolvedAtMs,
    resolvedByUid: capture.resolvedByUid,
  };
}

export function deserializeSiegeCapture(value: unknown): SiegeCaptureState | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.status !== "string" || !STATUSES.has(record.status as SiegeCaptureStatus)) {
    return undefined;
  }

  const attackingTeamId =
    record.attackingTeamId === null || record.attackingTeamId === undefined
      ? null
      : typeof record.attackingTeamId === "string" &&
          TEAMS.has(record.attackingTeamId as StandoffTeamId)
        ? (record.attackingTeamId as StandoffTeamId)
        : null;

  const optionalString = (key: string): string | null => {
    const v = record[key];
    if (v === null || v === undefined) {
      return null;
    }
    return typeof v === "string" ? v : null;
  };

  const optionalNumber = (key: string): number | null => {
    const v = record[key];
    if (v === null || v === undefined) {
      return null;
    }
    return typeof v === "number" && Number.isFinite(v) ? v : null;
  };

  return {
    status: record.status as SiegeCaptureStatus,
    attackingTeamId,
    submittedByUid: optionalString("submittedByUid"),
    photoStoragePath: optionalString("photoStoragePath"),
    submittedAtMs: optionalNumber("submittedAtMs"),
    confirmDeadlineMs: optionalNumber("confirmDeadlineMs"),
    resolvedAtMs: optionalNumber("resolvedAtMs"),
    resolvedByUid: optionalString("resolvedByUid"),
  };
}

export function idleSiegeCapturePatch(): Record<string, unknown> {
  return serializeSiegeCapture(createIdleSiegeCapture());
}
