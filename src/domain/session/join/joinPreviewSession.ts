import type { SessionMode, SessionRecord } from "../../map/annotations";
import { JOIN_PREVIEW_PLACEHOLDER_AREA } from "./joinPreviewGameArea";

export type JoinPreviewCodeRecord = {
  hostUid: string;
  createdAt?: string;
  tier?: SessionRecord["tier"];
  hostAppVersion?: string;
  status?: SessionRecord["status"];
  mode?: SessionMode;
  seriesLength?: 1 | 3;
};

export function buildJoinPreviewSession(
  sessionId: string,
  code: string,
  codeRecord: JoinPreviewCodeRecord,
): SessionRecord {
  const isCastleSiege = codeRecord.mode === "castleSiege";
  return {
    id: sessionId,
    code,
    gameArea: JOIN_PREVIEW_PLACEHOLDER_AREA,
    hostUid: codeRecord.hostUid,
    createdAt: codeRecord.createdAt ?? new Date().toISOString(),
    memberUids: [],
    memberRoles: {},
    gameSize: "medium",
    distanceUnit: "imperial",
    hidingZoneRadiusMeters: 402,
    tier: codeRecord.tier ?? "free",
    hostAppVersion: codeRecord.hostAppVersion,
    status: codeRecord.status ?? "active",
    ...(isCastleSiege
      ? {
          mode: "castleSiege" as const,
          seriesLength: codeRecord.seriesLength === 3 ? 3 : 1,
        }
      : {}),
  };
}
