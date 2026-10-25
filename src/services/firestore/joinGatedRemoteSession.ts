import { doc, getDocFromServer } from "firebase/firestore";
import type { SessionRecord, SessionTier } from "../../domain/map/annotations";
import { generateHealSecret, hashHealSecret } from "../../domain/session/join/healSecret";
import type { PlayerRole } from "../../domain/session/players/playerRole";
import { useSessionStore } from "../../state/sessionStore";
import { getFirestoreDb } from "../core/firebase/firebase";
import { joinSessionWithRole, mapRolePasscodeJoinError } from "../session/rolePasscodeLifecycle";
import { deserializeSessionFromFirestore } from "./serialization/serializeSession";

export type SessionCodeRecord = {
  sessionId: string;
  hostUid: string;
  hostAppVersion?: string;
  tier?: SessionTier;
  status?: "active" | "ended";
  createdAt?: string;
};

export type JoinGatedRemoteSessionResult = {
  status: "joined";
  session: SessionRecord;
  rolePasscode?: string;
  becameLeader?: boolean;
};

type LookupRemoteSessionByCode = (
  code: string,
) => Promise<
  { status: "missing" } | { status: "ended" } | { status: "found"; session: SessionRecord }
>;

type TouchSessionLastActive = (sessionId: string) => void;

async function getRemoteSessionByIdFromServer(sessionId: string): Promise<SessionRecord> {
  const sessionDoc = await getDocFromServer(doc(getFirestoreDb(), "sessions", sessionId));
  if (!sessionDoc.exists()) {
    throw new Error("Session not found.");
  }
  return deserializeSessionFromFirestore(
    sessionDoc.id,
    sessionDoc.data() as Record<string, unknown>,
  );
}

export async function joinGatedRemoteSessionByCode(input: {
  code: string;
  /** The uid joining now; a heal is a join whose returningMemberUid differs from it. */
  uid: string;
  codeRecord: SessionCodeRecord;
  role: PlayerRole;
  clientVersion: string;
  rolePasscode?: string;
  returningMemberUid?: string;
  persistedMyUid?: string | null;
  lookupRemoteSessionByCode: LookupRemoteSessionByCode;
  touchSessionLastActive: TouchSessionLastActive;
}): Promise<JoinGatedRemoteSessionResult> {
  try {
    const sessionId = input.codeRecord.sessionId;
    const storedSecret = useSessionStore.getState().healSecrets[sessionId];
    // Reuse the stored secret: the callable may move or keep a proof made from it.
    const secret = storedSecret ?? generateHealSecret();
    // Without crypto.subtle (insecure context) join without a proof.
    const proofHash = await hashHealSecret(secret).catch(() => undefined);

    const callableResult = await joinSessionWithRole({
      code: input.code,
      role: input.role,
      rolePasscode: input.rolePasscode,
      clientVersion: input.clientVersion,
      returningMemberUid: input.returningMemberUid,
      persistedMyUid: input.persistedMyUid ?? undefined,
      proofHash,
      healSecret:
        proofHash && input.returningMemberUid && input.returningMemberUid !== input.uid
          ? storedSecret
          : undefined,
    });
    if (proofHash) {
      useSessionStore.getState().setHealSecret(sessionId, secret);
    }

    let session: SessionRecord | null = null;
    try {
      session = await getRemoteSessionByIdFromServer(callableResult.sessionId);
    } catch {}

    if (!session) {
      const lookup = await input.lookupRemoteSessionByCode(input.code);
      if (lookup.status === "found") {
        session = lookup.session;
      }
    }

    if (!session) {
      throw new Error("Joined session could not be loaded.");
    }

    input.touchSessionLastActive(input.codeRecord.sessionId);

    return {
      status: "joined",
      session: { ...session, code: input.code },
      rolePasscode: callableResult.rolePasscode,
      becameLeader: callableResult.becameLeader,
    };
  } catch (error) {
    throw new Error(mapRolePasscodeJoinError(error), { cause: error });
  }
}
