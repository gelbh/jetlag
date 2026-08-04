import { FirebaseError } from "firebase/app";
import {
  arrayUnion,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import type {
  GameArea,
  SessionRecord,
  SessionTier,
} from "../../../domain/map/annotations";
import { hidingZoneRadiusMeters, type GameSize } from "../../../domain/session/size/gameSize";
import type { SessionRulesPatch } from "../../../domain/session/tools/advancedSessionSettings";
import {
  resolvePlayerRole,
  type PlayerRole,
} from "../../../domain/session/players/playerRole";
import { timerStateToRemote, type TimerState } from "../../../domain/session/timer/timer";
import {
  sessionVersionCompatible,
  sessionVersionMismatchMessage,
} from "../../../domain/session/meta/sessionVersion";
import { APP_VERSION } from "../../../domain/device/changelog";
import { clientEnvUsesFirebaseEmulator } from "../../../config/env";
import { getFirestoreDb } from "../../core/firebase/firebase";
import { forceRefreshIdToken } from "../../core/auth/forceRefreshIdToken";
import { reportJoinPermissionDenied } from "../../core/analytics/sentry";
import {
  buildSessionDocument,
  deserializeSessionFromFirestore,
  parseEndGameTruthAnchors,
  sessionRulesPatchToFirestore,
} from "../serialization/serializeSession";
import { buildJoinPreviewSession } from "../../../domain/session/join/joinPreviewSession";
import { photoUploadAccessError } from "../../../domain/questions";
import { generateSessionCode } from "../../session/sessionCodes";
import {
  cancelOpenPendingQuestions,
  cancelWalkingThermometersAfterIdentityHeal,
  postGameSystemMessage,
} from "../firestoreSessionExtras";
import { emitGameEndedActivity } from "../../session/emitSessionActivity";
import {
  buildMemberUidsAfterHeal,
  buildMembershipHealState,
  sanitizeReturningMemberUid,
} from "../../../domain/session/players/returningMember";
import { isSessionRoleGated, buildRoleGatesForHost } from "../../../domain/session/players/roleGates";
import { repairGhostHost } from "../../session/sessionLifecycle";
import { initSessionRoleGates } from "../../session/rolePasscodeLifecycle";
import { joinGatedRemoteSessionByCode } from "../joinGatedRemoteSession";

import {
  sessionsCollection,
  endGameTruthAnchorsDoc,
  clearEndGameTruthAnchorsDoc,
  sessionCodeDoc,
  rollbackCreatedRemoteSession,
  annotationsCollection,
  withJoinPermissionRetry,
  readSessionMembershipFields,
  membershipPatchFromHealState,
  writeSessionMembershipPatch,
  applyReturningMemberHealWrite,
  isReclaimableSessionForCode,
  isFirestorePermissionDenied,
  JOIN_AUTH_FAILURE_MESSAGE,
  HIDER_ROLE_POLL_MS,
  HIDER_ROLE_POLL_MAX_MS,
  FIRESTORE_BATCH_LIMIT,
} from "./shared";

export type EnsureRemoteSessionMembershipOptions = {
  returningMemberUid?: string | null;
  persistedMyUid?: string | null;
};
type JoinRemoteSessionOptions = {
  returningMemberUid?: string;
  persistedMyUid?: string | null;
  rolePasscode?: string;
};
export async function ensureRemoteSessionMembership(
  session: Pick<SessionRecord, "id" | "code" | "memberUids" | "memberRoles">,
  uid: string,
  role: PlayerRole,
  options?: EnsureRemoteSessionMembershipOptions,
): Promise<SessionRecord> {
  let serverSession: SessionRecord | null = null;
  try {
    serverSession = await getRemoteSessionByIdFromServer(session.id);
  } catch (error) {
    if (!isFirestorePermissionDenied(error)) {
      throw error;
    }
  }

  if (!serverSession) {
    const lookup = await lookupRemoteSessionByCode(session.code);
    if (lookup.status === "missing") {
      throw new Error("That session no longer exists.");
    }
    if (lookup.status === "ended") {
      throw new Error("That session has ended. Join or create a new one.");
    }
    serverSession = lookup.session;
  }

  if (serverSession.endedAt) {
    throw new Error("That session has ended. Join or create a new one.");
  }

  if (serverSession.memberUids.includes(uid)) {
    return serverSession;
  }

  const result = await joinRemoteSessionByCode(serverSession.code, uid, role, APP_VERSION, {
    returningMemberUid: options?.returningMemberUid ?? undefined,
    persistedMyUid: options?.persistedMyUid ?? options?.returningMemberUid ?? undefined,
  });

  if (result.status === "joined") {
    return result.session;
  }

  throw mapJoinFailureToError(
    result,
    "You are not a member of this session. Rejoin with the session code.",
  );
}

export async function ensureRemoteSessionWriteAccess(
  session: SessionRecord,
  uid: string,
  role: PlayerRole = resolvePlayerRole(session.memberRoles, uid),
  options?: EnsureRemoteSessionMembershipOptions,
): Promise<SessionRecord> {
  try {
    return await ensureRemoteSessionMembership(session, uid, role, options);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "That session no longer exists."
    ) {
      throw new Error("No access to that session.", { cause: error });
    }

    throw error;
  }
}

export async function createRemoteSession(
  gameArea: GameArea,
  hostUid: string,
  tier: SessionTier = "free",
  transitMetroId?: string,
  hostRole: PlayerRole = "seeker",
  gameSize: GameSize = "medium",
  rulesPatch: SessionRulesPatch = {},
  distanceUnit: SessionRecord["distanceUnit"] = "imperial",
  hostAppVersion: string = APP_VERSION,
): Promise<SessionRecord> {
  let code = generateSessionCode();
  let attempts = 0;

  while (attempts < 8) {
    const existing = await getDoc(sessionCodeDoc(code));
    if (!existing.exists()) {
      break;
    }

    try {
      // Rules allow delete only for host, missing session, or ended session.
      await deleteDoc(sessionCodeDoc(code));
      break;
    } catch {
      code = generateSessionCode();
      attempts += 1;
    }
  }

  const sessionRef = doc(sessionsCollection());
  const createdAt = new Date().toISOString();
  const radiusMeters =
    typeof rulesPatch.hidingZoneRadiusMeters === "number"
      ? rulesPatch.hidingZoneRadiusMeters
      : hidingZoneRadiusMeters(gameSize, distanceUnit ?? "imperial");
  const session: SessionRecord = {
    id: sessionRef.id,
    code,
    gameArea,
    hostUid,
    createdAt,
    memberUids: [hostUid],
    memberRoles: { [hostUid]: hostRole },
    gameSize,
    distanceUnit: distanceUnit ?? "imperial",
    hidingZoneRadiusMeters: radiusMeters,
    tier,
    transitMetroId,
    hostAppVersion,
    ...rulesPatch,
  };

  await setDoc(sessionRef, {
    ...buildSessionDocument(
      code,
      gameArea,
      hostUid,
      createdAt,
      tier,
      transitMetroId,
      hostRole,
      gameSize,
      rulesPatch,
      distanceUnit ?? "imperial",
      hostAppVersion,
    ),
    createdAtServer: serverTimestamp(),
  });

  await setDoc(sessionCodeDoc(code), {
    sessionId: sessionRef.id,
    hostUid,
    hostAppVersion,
    tier,
    status: "active",
    createdAt,
  });

  // CI e2e / local emulator run auth+firestore+storage only — no Functions.
  // Leave ungated (legacy join); design: sessions without roleGates stay open.
  if (clientEnvUsesFirebaseEmulator()) {
    return session;
  }

  // Stamp roleGates + secrets together via callable (do not gate without secrets).
  try {
    await initSessionRoleGates(sessionRef.id);
  } catch (error) {
    await rollbackCreatedRemoteSession(sessionRef.id, code);
    throw new Error(
      "Couldn't set up role codes for this session. Try creating again.",
      { cause: error },
    );
  }
  session.roleGates = buildRoleGatesForHost(hostUid, hostRole);

  return session;
}

