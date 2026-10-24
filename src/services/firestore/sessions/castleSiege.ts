import { doc, setDoc, updateDoc } from "firebase/firestore";
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

/** Team member commits a client seal hash (no plaintext on the server yet). */
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

/** Team member commits hash + AES-GCM ciphertext envelope (no plaintext coords). */
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
