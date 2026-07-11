import type { SessionRecord } from "../../domain/map/annotations";
import type { PlayerRole } from "../../domain/session/playerRole";
import {
  ensureRemoteSessionMembership,
  ensureRemoteSessionWriteAccess,
  getRemoteSessionById,
  getRemoteSessionByIdFromServer,
  type EnsureRemoteSessionMembershipOptions,
} from "./firestoreAnnotations";
import {
  memberUidSetsEqual,
  sanitizeReturningMemberUid,
} from "../../domain/session/returningMember";

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

export {
  ensureRemoteSessionWriteAccess,
  getRemoteSessionById,
  getRemoteSessionByIdFromServer,
};
