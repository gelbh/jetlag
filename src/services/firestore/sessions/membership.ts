import { deleteDoc, doc, getDoc, serverTimestamp, writeBatch } from "firebase/firestore";
import { clientEnvUsesFirebaseEmulator } from "@/config/env";
import { APP_VERSION } from "@/domain/device/changelog";
import { isEffectivelyOffline } from "@/domain/device/sync/sync";
import type { GameArea, SessionRecord, SessionTier } from "@/domain/map/annotations";
import { type PlayerRole, resolvePlayerRole } from "@/domain/session/players/playerRole";
import { buildRoleGatesForHost } from "@/domain/session/players/roleGates";
import { type GameSize, hidingZoneRadiusMeters } from "@/domain/session/size/gameSize";
import type { SessionRulesPatch } from "@/domain/session/tools/advancedSessionSettings";
import { getFirestoreDb } from "@/services/core/firebase/firebase";
import { initSessionRoleGates } from "@/services/session/rolePasscodeLifecycle";
import { generateSessionCode } from "@/services/session/sessionCodes";
import { useSessionStore } from "@/state/sessionStore";
import { buildSessionDocument } from "../serialization/serializeSession";
import * as sessionJoin from "./join";
import {
  isFirestorePermissionDenied,
  rollbackCreatedRemoteSession,
  sessionCodeDoc,
  sessionsCollection,
  withPermissionDeniedAuthRetry,
} from "./shared";

export type EnsureRemoteSessionMembershipOptions = {
  returningMemberUid?: string | null;
  persistedMyUid?: string | null;
};

/**
 * While effectively offline a server read cannot succeed (or stalls on weak
 * signal), so a write-access check trusts the caller's cached session when it
 * already lists `uid`. Firestore rules still enforce membership when any
 * queued write replays. Heals never take this path: they must hit the server.
 */
function isTrustedCachedMemberWhileOffline(session: SessionRecord, uid: string): boolean {
  if (session.endedAt || !session.memberUids.includes(uid)) {
    return false;
  }

  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  const { networkReachable } = useSessionStore.getState();
  return isEffectivelyOffline({ online, reachable: networkReachable });
}

export async function ensureRemoteSessionMembership(
  session: Pick<SessionRecord, "id" | "code" | "memberUids" | "memberRoles">,
  uid: string,
  role: PlayerRole,
  options?: EnsureRemoteSessionMembershipOptions,
): Promise<SessionRecord> {
  let serverSession: SessionRecord | null = null;
  try {
    serverSession = await sessionJoin.getRemoteSessionByIdFromServer(session.id);
  } catch (error) {
    if (!isFirestorePermissionDenied(error)) {
      throw error;
    }
  }

  if (!serverSession) {
    const lookup = await sessionJoin.lookupRemoteSessionByCode(session.code);
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

  const result = await sessionJoin.joinRemoteSessionByCode(
    serverSession.code,
    uid,
    role,
    APP_VERSION,
    {
      returningMemberUid: options?.returningMemberUid ?? undefined,
      persistedMyUid: options?.persistedMyUid ?? options?.returningMemberUid ?? undefined,
    },
  );

  if (result.status === "joined") {
    return result.session;
  }

  throw sessionJoin.mapJoinFailureToError(
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
  if (isTrustedCachedMemberWhileOffline(session, uid)) {
    return session;
  }

  try {
    return await ensureRemoteSessionMembership(session, uid, role, options);
  } catch (error) {
    if (error instanceof Error && error.message === "That session no longer exists.") {
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

  const unit = distanceUnit ?? "imperial";
  const radiusMeters =
    typeof rulesPatch.hidingZoneRadiusMeters === "number"
      ? rulesPatch.hidingZoneRadiusMeters
      : hidingZoneRadiusMeters(gameSize, unit);

  // New session id per attempt so a denied retry never updates an orphaned doc.
  const session = await withPermissionDeniedAuthRetry(async () => {
    const sessionRef = doc(sessionsCollection());
    const createdAt = new Date().toISOString();
    const record: SessionRecord = {
      id: sessionRef.id,
      code,
      gameArea,
      hostUid,
      createdAt,
      memberUids: [hostUid],
      memberRoles: { [hostUid]: hostRole },
      gameSize,
      distanceUnit: unit,
      hidingZoneRadiusMeters: radiusMeters,
      tier,
      transitMetroId,
      hostAppVersion,
      ...rulesPatch,
    };

    const batch = writeBatch(getFirestoreDb());
    batch.set(sessionRef, {
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
        unit,
        hostAppVersion,
      ),
      createdAtServer: serverTimestamp(),
    });
    batch.set(sessionCodeDoc(code), {
      sessionId: sessionRef.id,
      hostUid,
      hostAppVersion,
      tier,
      status: "active",
      createdAt,
    });
    await batch.commit();
    return record;
  });

  // CI e2e / local emulator run auth+firestore+storage only — no Functions.
  // Leave ungated (legacy join); design: sessions without roleGates stay open.
  if (clientEnvUsesFirebaseEmulator()) {
    return session;
  }

  // Stamp roleGates + secrets together via callable (do not gate without secrets).
  try {
    await initSessionRoleGates(session.id);
  } catch (error) {
    await rollbackCreatedRemoteSession(session.id, code);
    throw new Error("Couldn't set up role codes for this session. Try creating again.", {
      cause: error,
    });
  }
  session.roleGates = buildRoleGatesForHost(hostUid, hostRole);

  return session;
}
