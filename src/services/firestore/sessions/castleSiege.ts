import { doc, setDoc, updateDoc, writeBatch } from "firebase/firestore";
import type { SiegeCaptureState } from "@/domain/session/castleSiege/siegeCapture";
import { serializeSiegeCapture } from "@/domain/session/castleSiege/siegeCapturePersist";
import type { SiegeClockState, SiegeEndgameStart } from "@/domain/session/castleSiege/siegeClocks";
import {
  buildStartSiegePublicPatch,
  serializeSiegeClock,
} from "@/domain/session/castleSiege/siegePersist";
import { buildStartStandoffPrivateState } from "@/domain/session/castleSiege/standoffPersist";
import type { TeamMarksGeometry } from "@/domain/session/castleSiege/teamMarks";
import { getFirestoreDb } from "@/services/core/firebase/firebase";
import {
  buildTeamSealCipherDocument,
  buildTeamSealHashDocument,
  type CastleSiegeSetupPatch,
  castleSiegeSetupPatchToFirestore,
  type TeamSealCipherRecord,
  type TeamSealHashRecord,
} from "../serialization/serializeCastleSiege";
import { sessionsCollection } from "./shared";

function teamSealDoc(sessionId: string, teamId: string) {
  return doc(getFirestoreDb(), "sessions", sessionId, "teamSeals", teamId);
}

function teamMarksDoc(sessionId: string, teamId: string) {
  return doc(getFirestoreDb(), "sessions", sessionId, "teamMarks", teamId);
}

function teamPressureDoc(sessionId: string, teamId: string) {
  return doc(getFirestoreDb(), "sessions", sessionId, "teamPressure", teamId);
}

function standoffPrivateDeckDoc(sessionId: string) {
  return doc(getFirestoreDb(), "sessions", sessionId, "standoffPrivate", "deck");
}

function teamHandsDoc(sessionId: string, teamId: string) {
  return doc(getFirestoreDb(), "sessions", sessionId, "teamHands", teamId);
}

/** Host writes Pregame arena / border / belt / dials / coin onto the session doc. */
export async function updateCastleSiegeSetup(
  sessionId: string,
  patch: CastleSiegeSetupPatch,
): Promise<void> {
  const payload = castleSiegeSetupPatchToFirestore(patch);
  if (Object.keys(payload).length === 0) {
    return;
  }
  await updateDoc(doc(sessionsCollection(), sessionId), payload);
}

export async function writeTeamSealHash(
  sessionId: string,
  seal: TeamSealHashRecord,
): Promise<void> {
  await setDoc(
    teamSealDoc(sessionId, seal.teamId),
    buildTeamSealHashDocument({
      hash: seal.hash,
      sealedByUid: seal.sealedByUid,
      sealedAt: seal.sealedAt,
    }),
  );
}

export async function writeTeamSealCipher(
  sessionId: string,
  seal: TeamSealCipherRecord,
): Promise<void> {
  await setDoc(
    teamSealDoc(sessionId, seal.teamId),
    buildTeamSealCipherDocument({
      hash: seal.hash,
      sealedByUid: seal.sealedByUid,
      sealedAt: seal.sealedAt,
      ciphertext: seal.ciphertext,
    }),
  );
}

/**
 * Host starts Standoff: public phase/turn/count on session;
 * deck ids + hands in restricted subcollections (enemy cannot read).
 */
export async function startCastleSiegeStandoff(
  sessionId: string,
  nowMs = Date.now(),
  seed = nowMs,
): Promise<void> {
  const { deck, hands, publicPatch } = buildStartStandoffPrivateState(nowMs, seed);
  const db = getFirestoreDb();
  const batch = writeBatch(db);
  batch.update(doc(sessionsCollection(), sessionId), publicPatch);
  batch.set(standoffPrivateDeckDoc(sessionId), {
    remainingIds: deck.remainingIds,
    discardIds: deck.discardIds,
  });
  batch.set(teamHandsDoc(sessionId, "teamA"), {
    cardIds: hands.teamA,
    updatedAt: new Date(nowMs).toISOString(),
  });
  batch.set(teamHandsDoc(sessionId, "teamB"), {
    cardIds: hands.teamB,
    updatedAt: new Date(nowMs).toISOString(),
  });
  await batch.commit();
}

/**
 * Host opens Siege: public phase + siegeClock (Dusk head-start already baked in).
 */
export async function startCastleSiegeSiege(
  sessionId: string,
  opts: {
    nowMs?: number;
    limitSeconds: number;
    endgame: SiegeEndgameStart;
  },
): Promise<void> {
  const patch = buildStartSiegePublicPatch({
    nowMs: opts.nowMs ?? Date.now(),
    limitSeconds: opts.limitSeconds,
    endgame: opts.endgame,
  });
  await updateDoc(doc(sessionsCollection(), sessionId), patch);
}

/** Persist capture state; optionally update siegeClock (dispute pause). */
export async function writeCastleSiegeCapture(
  sessionId: string,
  capture: SiegeCaptureState,
  siegeClock?: SiegeClockState,
): Promise<void> {
  const patch: Record<string, unknown> = {
    siegeCapture: serializeSiegeCapture(capture),
  };
  if (siegeClock) {
    patch.siegeClock = serializeSiegeClock(siegeClock);
  }
  await updateDoc(doc(sessionsCollection(), sessionId), patch);
}

/** Defenders-only H5 pressure doc path (enemy cannot read — same gate as teamMarks). */
export function castleSiegeTeamPressureRef(sessionId: string, teamId: "teamA" | "teamB") {
  return teamPressureDoc(sessionId, teamId);
}

/** Own-team shade polygons (enemy clients cannot read — V12). */
export async function writeTeamMarks(
  sessionId: string,
  teamId: "teamA" | "teamB",
  geometry: TeamMarksGeometry,
  updatedByUid: string,
): Promise<void> {
  await setDoc(teamMarksDoc(sessionId, teamId), {
    geometryJson: JSON.stringify(geometry),
    updatedByUid,
    updatedAt: new Date().toISOString(),
  });
}
