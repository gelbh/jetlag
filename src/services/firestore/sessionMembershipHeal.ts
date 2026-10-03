import type { SessionRecord } from "../../domain/map/annotations";
import { type PlayerRole, resolvePlayerRole } from "../../domain/session/players/playerRole";
import {
  memberUidSetsEqual,
  sanitizeReturningMemberUid,
} from "../../domain/session/players/returningMember";
import {
  type EnsureRemoteSessionMembershipOptions,
  ensureRemoteSessionMembership,
  ensureRemoteSessionWriteAccess,
} from "./sessions/membership";
import { isFirestorePermissionDenied } from "./sessions/shared";

export type HealSessionMembershipOptions = EnsureRemoteSessionMembershipOptions & {
  persistedMyUid?: string | null;
};

export function resolveReturningMemberUid(
  options?: HealSessionMembershipOptions,
): string | undefined {
  return sanitizeReturningMemberUid(
    options?.persistedMyUid,
    options?.returningMemberUid ?? undefined,
  );
}

export function sessionMembershipChanged(
  previous: Pick<SessionRecord, "id" | "memberUids">,
  next: Pick<SessionRecord, "id" | "memberUids">,
  nextUid: string,
  previousUid?: string | null,
): boolean {
  return (
    next.id !== previous.id ||
    !memberUidSetsEqual(next.memberUids, previous.memberUids) ||
    nextUid !== previousUid
  );
}

export async function healSessionMembership(
  session: Pick<SessionRecord, "id" | "code" | "memberUids" | "memberRoles">,
  uid: string,
  role: PlayerRole,
  options?: HealSessionMembershipOptions,
): Promise<SessionRecord> {
  const returningMemberUid = resolveReturningMemberUid(options);

  return ensureRemoteSessionMembership(session, uid, role, {
    returningMemberUid,
    persistedMyUid: options?.persistedMyUid,
  });
}

export type SessionWriteAccessInput = {
  session: SessionRecord;
  uid: string;
  myUid?: string | null;
  onSessionChange: (next: SessionRecord) => void;
  write: (sessionId: string) => Promise<void>;
};

/**
 * Runs a session-scoped write without a per-write server membership read when
 * the cached session already lists `uid`; Firestore rules still gate the write.
 * On `permission-denied` the membership is healed once (always from the
 * server) and the write retried; a second denial surfaces to the caller.
 */
export async function withSessionWriteAccess({
  session,
  uid,
  myUid,
  onSessionChange,
  write,
}: SessionWriteAccessInput): Promise<void> {
  const options = { returningMemberUid: myUid, persistedMyUid: myUid };
  let activeSession = session;

  if (!session.memberUids.includes(uid)) {
    activeSession = await ensureRemoteSessionWriteAccess(
      session,
      uid,
      resolvePlayerRole(session.memberRoles, uid),
      options,
    );

    if (sessionMembershipChanged(session, activeSession, uid, myUid)) {
      onSessionChange(activeSession);
    }
  }

  try {
    await write(activeSession.id);
  } catch (error) {
    if (!isFirestorePermissionDenied(error)) {
      throw error;
    }

    const healedSession = await healSessionMembership(
      activeSession,
      uid,
      resolvePlayerRole(activeSession.memberRoles, uid),
      options,
    );

    onSessionChange(healedSession);
    await write(healedSession.id);
  }
}

// Session reads for continue/rejoin flows. Keep these as re-exports from the
// sessions barrel so callers do not import the join module through this heal
// surface (avoids vitest circular-mock dead bindings in annotation write tests).
export {
  ensureRemoteSessionWriteAccess,
  getRemoteSessionById,
  getRemoteSessionByIdFromServer,
  lookupRemoteSessionByCode,
} from "./firestoreSessions";
