import type { GameArea } from "../map/annotations";
import type { TransitStation } from "../session/hidingZone";
import { isValidHidingStation } from "../session/hidingZone";

export const DEFAULT_TIME_TRAP_BONUS_MINUTES = 5;

export interface TimeTrapRecord {
  hiderUid: string;
  sessionId: string;
  stationId: string;
  stationName: string;
  center: { lat: number; lng: number };
  bonusMinutes: number;
  placedAt: string;
}

export function isValidTimeTrapStation(
  station: TransitStation,
  gameArea: GameArea,
): boolean {
  return isValidHidingStation(station, gameArea);
}

export function timeTrapForHider(
  traps: readonly TimeTrapRecord[],
  hiderUid: string,
): TimeTrapRecord | null {
  return traps.find((trap) => trap.hiderUid === hiderUid) ?? null;
}

export function buildTimeTrapRecord(
  sessionId: string,
  hiderUid: string,
  station: TransitStation,
  bonusMinutes = DEFAULT_TIME_TRAP_BONUS_MINUTES,
): TimeTrapRecord {
  return {
    hiderUid,
    sessionId,
    stationId: station.id,
    stationName: station.name,
    center: { lat: station.lat, lng: station.lng },
    bonusMinutes,
    placedAt: new Date().toISOString(),
  };
}
