import type { SessionRecord } from "../map/annotations";
import { JOIN_PREVIEW_PLACEHOLDER_AREA } from "./joinPreviewGameArea";

export type JoinPreviewCodeRecord = {
  hostUid: string;
  createdAt?: string;
  tier?: SessionRecord["tier"];
  hostAppVersion?: string;
  status?: SessionRecord["status"];
};

export function buildJoinPreviewSession(
  sessionId: string,
  code: string,
  codeRecord: JoinPreviewCodeRecord,
): SessionRecord {
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
  };
}
