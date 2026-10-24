import { FieldValue } from "firebase-admin/firestore";
import {
  computePressure,
  declareProximityFromDistance,
  nearestAttackerProximityFromDistance,
  shadeCoverageFromGeometryJson,
} from "./pressure.mjs";

const PLAYING_TEAMS = new Set(["teamA", "teamB"]);
const PRESSURE_DECLARE_FALLBACK_FAR = 2_000;

/**
 * Recompute defender pressure and write teamPressure/{defenderTeamId} (Admin SDK).
 * Never writes attacker marks or coords onto the pressure doc.
 *
 * @param {{
 *   db: FirebaseFirestore.Firestore,
 *   sessionId: string,
 *   defenderTeamId: string,
 *   attackerTeamId: string,
 *   declareDistanceMeters?: number | null,
 *   nearestAttackerDistanceMeters?: number | null,
 * }} input
 */
export async function recomputeAndWritePressure(input) {
  const { db, sessionId, defenderTeamId, attackerTeamId } = input;
  if (!PLAYING_TEAMS.has(defenderTeamId) || !PLAYING_TEAMS.has(attackerTeamId)) {
    throw new Error("PRESSURE_INVALID_TEAM");
  }

  const sessionRef = db.collection("sessions").doc(sessionId);
  const sessionSnap = await sessionRef.get();
  const session = sessionSnap.data() ?? {};
  const dials = session.dials && typeof session.dials === "object" ? session.dials : {};
  const zoneRadiusMeters =
    typeof dials.zoneRadiusMeters === "number" ? dials.zoneRadiusMeters : 500;

  const [askSnap, marksSnap] = await Promise.all([
    sessionRef
      .collection("oracleAskReceipts")
      .limit(50)
      .get()
      .catch((err) => {
        console.warn("castleSiege pressure: oracleAskReceipts read failed", {
          sessionId,
          message: err instanceof Error ? err.message : String(err),
        });
        return null;
      }),
    sessionRef.collection("teamMarks").doc(attackerTeamId).get(),
  ]);

  // Ask ratio from persisted receipts only — never substitute declareAttempts.
  const askCount = askSnap && !askSnap.empty ? askSnap.size : 0;
  const askEliminationRatio = Math.min(1, askCount / 28);

  const geometryJson =
    marksSnap.exists && typeof marksSnap.data()?.geometryJson === "string"
      ? marksSnap.data().geometryJson
      : "";
  const shadeCoverageRatio = shadeCoverageFromGeometryJson(geometryJson);

  const declareDistance =
    typeof input.declareDistanceMeters === "number" && Number.isFinite(input.declareDistanceMeters)
      ? input.declareDistanceMeters
      : PRESSURE_DECLARE_FALLBACK_FAR;

  const phase = session.phase;
  const nearestAttackerProximity =
    phase === "siege" &&
    typeof input.nearestAttackerDistanceMeters === "number" &&
    Number.isFinite(input.nearestAttackerDistanceMeters)
      ? nearestAttackerProximityFromDistance(input.nearestAttackerDistanceMeters, zoneRadiusMeters)
      : null;

  const reading = computePressure({
    askEliminationRatio,
    declareProximity: declareProximityFromDistance(declareDistance),
    shadeCoverageRatio,
    nearestAttackerProximity,
  });

  // Scalar + band only; never persist declare distance, shade, or attacker coords.
  await sessionRef.collection("teamPressure").doc(defenderTeamId).set(
    {
      scalar: reading.scalar,
      band: reading.band,
      updatedAt: FieldValue.serverTimestamp(),
      lastDeclareDistanceMeters: FieldValue.delete(),
    },
    { merge: true },
  );

  return reading;
}
