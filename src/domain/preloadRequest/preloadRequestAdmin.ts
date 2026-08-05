import type {
  PreloadPresetSnapshot,
  PreloadRequest,
  PreloadRequestEmailState,
  PreloadRequestStatus,
} from "./preloadRequestTypes";
import { parseRegionPackId } from "../regions/regionPack";

const STATUSES = new Set<PreloadRequestStatus>([
  "open",
  "accepted",
  "declined",
  "shipped",
]);

export function isPreloadRequestStatus(
  value: unknown,
): value is PreloadRequestStatus {
  return typeof value === "string" && STATUSES.has(value as PreloadRequestStatus);
}

/** Admin status edges for inbox actions (mirrors Cloud Function ALLOWED). */
const ALLOWED: Record<PreloadRequestStatus, ReadonlySet<PreloadRequestStatus>> =
  {
    open: new Set(["accepted", "declined", "shipped"]),
    accepted: new Set(["shipped", "declined", "open"]),
    declined: new Set(["open", "accepted"]),
    shipped: new Set(["open"]),
  };

export function canTransitionPreloadRequestStatus(
  from: PreloadRequestStatus,
  to: PreloadRequestStatus,
): boolean {
  return ALLOWED[from]?.has(to) ?? false;
}

export function preloadRequestStatusChipLabel(
  status: PreloadRequestStatus,
): string {
  switch (status) {
    case "open":
      return "OPEN";
    case "accepted":
      return "ACCEPTED";
    case "declined":
      return "DECLINED";
    case "shipped":
      return "SHIPPED";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export type PreloadStatusChipTone = "open" | "active" | "muted" | "warning";

export function preloadRequestStatusChipTone(
  status: PreloadRequestStatus,
): PreloadStatusChipTone {
  switch (status) {
    case "open":
      return "open";
    case "accepted":
      return "active";
    case "declined":
      return "warning";
    case "shipped":
      return "muted";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function countOpenPreloadRequests(
  requests: readonly PreloadRequest[],
): number {
  return requests.filter((request) => request.status === "open").length;
}

function parseEmailState(
  value: unknown,
): PreloadRequestEmailState | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const out: PreloadRequestEmailState = {};
  if (typeof record.sentAt === "string") {
    out.sentAt = record.sentAt;
  }
  if (typeof record.messageId === "string") {
    out.messageId = record.messageId;
  }
  if (typeof record.error === "string") {
    out.error = record.error;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseSnapshot(value: unknown): PreloadPresetSnapshot | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.name !== "string" || record.name.trim().length === 0) {
    return null;
  }
  if (
    record.gameSize !== "small" &&
    record.gameSize !== "medium" &&
    record.gameSize !== "large"
  ) {
    return null;
  }
  if (record.distanceUnit !== "imperial" && record.distanceUnit !== "metric") {
    return null;
  }

  const snapshot: PreloadPresetSnapshot = {
    name: record.name.trim(),
    gameSize: record.gameSize,
    distanceUnit: record.distanceUnit,
  };

  if (typeof record.placeLabel === "string") {
    snapshot.placeLabel = record.placeLabel;
  }
  if (typeof record.gameAreaBytes === "number") {
    snapshot.gameAreaBytes = record.gameAreaBytes;
  }
  const packId = parseRegionPackId(record.regionPackId);
  if (packId) {
    snapshot.regionPackId = packId;
  }
  if (typeof record.presetId === "string") {
    snapshot.presetId = record.presetId;
  }
  if (
    typeof record.focusBounds === "object" &&
    record.focusBounds !== null &&
    !Array.isArray(record.focusBounds)
  ) {
    const bounds = record.focusBounds as Record<string, unknown>;
    const { south, west, north, east } = bounds;
    if (
      typeof south === "number" &&
      typeof west === "number" &&
      typeof north === "number" &&
      typeof east === "number"
    ) {
      snapshot.focusBounds = { south, west, north, east };
    }
  }

  return snapshot;
}

export function deserializePreloadRequest(
  id: string,
  data: Record<string, unknown>,
): PreloadRequest | null {
  if (!isPreloadRequestStatus(data.status)) {
    return null;
  }
  if (typeof data.createdAt !== "string" || typeof data.updatedAt !== "string") {
    return null;
  }
  if (typeof data.reporterUid !== "string") {
    return null;
  }
  const presetSnapshot = parseSnapshot(data.presetSnapshot);
  if (!presetSnapshot) {
    return null;
  }

  const request: PreloadRequest = {
    id,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    status: data.status,
    reporterUid: data.reporterUid,
    presetSnapshot,
  };

  if (typeof data.note === "string" || data.note === null) {
    request.note = data.note;
  }
  const email = parseEmailState(data.email);
  if (email) {
    request.email = email;
  }

  return request;
}
