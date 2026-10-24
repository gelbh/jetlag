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

  const [askSnap, marksSnap, priorPressureSnap] = await Promise.all([
    sessionRef
      .collection("oracleAskReceipts")
      .limit(50)
      .get()
      .catch(() => null),
    sessionRef.collection("teamMarks").doc(attackerTeamId).get(),
    sessionRef.collection("teamPressure").doc(defenderTeamId).get(),
  ]);

  // Prefer declareAttempts count when oracle receipts collection is absent.
  let askCount = askSnap && !askSnap.empty ? askSnap.size : 0;
  if (askCount === 0) {
    const declareSnap = await sessionRef.collection("declareAttempts").limit(50).get();
    askCount = declareSnap.size;
  }
  const askEliminationRatio = Math.min(1, askCount / 28);

  const geometryJson =
    marksSnap.exists && typeof marksSnap.data()?.geometryJson === "string"
      ? marksSnap.data().geometryJson
      : "";
  const shadeCoverageRatio = shadeCoverageFromGeometryJson(geometryJson);

  let declareDistance = input.declareDistanceMeters;
  if (declareDistance === undefined || declareDistance === null) {
    const prior = priorPressureSnap.exists ? priorPressureSnap.data() : null;
    declareDistance =
      prior && typeof prior.lastDeclareDistanceMeters === "number"
        ? prior.lastDeclareDistanceMeters
        : PRESSURE_DECLARE_FALLBACK_FAR;
  }

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

  // Never persist raw shade or attacker coords; optional lastDeclareDistance for next pass.
  await sessionRef
    .collection("teamPressure")
    .doc(defenderTeamId)
    .set(
      {
        scalar: reading.scalar,
        band: reading.band,
        updatedAt: FieldValue.serverTimestamp(),
        lastDeclareDistanceMeters:
          typeof declareDistance === "number" && Number.isFinite(declareDistance)
            ? declareDistance
            : FieldValue.delete(),
      },
      { merge: true },
    );

  return reading;
}
