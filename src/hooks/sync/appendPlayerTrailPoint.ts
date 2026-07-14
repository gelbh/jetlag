import type { PlayerRole } from "../../domain/session/playerRole";
import { haversineMeters } from "../../domain/geometry/distance";
import {
  TRAIL_MIN_DISTANCE_METERS,
  TRAIL_MIN_INTERVAL_MS,
  type PlayerTrailPointRecord,
} from "../../domain/game/playerTrail";
import { appendPlayerTrailPoint } from "../../services/firestore/firestoreSessionExtras";

interface TrailReading {
  lat: number;
  lng: number;
  accuracyMeters?: number;
}

const lastTrailSampleByKey = new Map<
  string,
  { lat: number; lng: number; recordedAtMs: number }
>();

function trailKey(sessionId: string, uid: string): string {
  return `${sessionId}:${uid}`;
}

export function shouldAppendTrailPoint(
  sessionId: string,
  uid: string,
  reading: TrailReading,
  nowMs = Date.now(),
): boolean {
  const key = trailKey(sessionId, uid);
  const prior = lastTrailSampleByKey.get(key);
  if (!prior) {
    return true;
  }

  const moved = haversineMeters(
    [prior.lat, prior.lng],
    [reading.lat, reading.lng],
  );
  return (
    moved >= TRAIL_MIN_DISTANCE_METERS ||
    nowMs - prior.recordedAtMs >= TRAIL_MIN_INTERVAL_MS
  );
}

export async function maybeAppendPlayerTrailPoint(params: {
  sessionId: string;
  uid: string;
  role: PlayerRole;
  reading: TrailReading;
}): Promise<void> {
  const { sessionId, uid, role, reading } = params;
  const nowMs = Date.now();
  if (!shouldAppendTrailPoint(sessionId, uid, reading, nowMs)) {
    return;
  }

  const recordedAt = new Date(nowMs).toISOString();
  const point: PlayerTrailPointRecord = {
    uid,
    sessionId,
    lat: reading.lat,
    lng: reading.lng,
    accuracyMeters: reading.accuracyMeters,
    role,
    recordedAt,
  };

  lastTrailSampleByKey.set(trailKey(sessionId, uid), {
    lat: reading.lat,
    lng: reading.lng,
    recordedAtMs: nowMs,
  });

  await appendPlayerTrailPoint(sessionId, point);
}

export function resetTrailPointCacheForTests(): void {
  lastTrailSampleByKey.clear();
}
