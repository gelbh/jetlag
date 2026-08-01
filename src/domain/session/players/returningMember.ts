import type { PlayerRole } from "./playerRole";
import { pickHostPromotee } from "./pickHostPromotee";

/**
 * Only honor a returning-member heal when the client persisted the prior UID locally.
 */
export function sanitizeReturningMemberUid(
  persistedMyUid: string | null | undefined,
  candidate: string | null | undefined,
): string | undefined {
  if (
    typeof persistedMyUid !== "string" ||
    persistedMyUid.length === 0 ||
    typeof candidate !== "string" ||
    candidate.length === 0
  ) {
    return undefined;
  }

  return persistedMyUid === candidate ? candidate : undefined;
}

export function memberUidSetsEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((uid, index) => uid === sortedRight[index]);
}

export function buildMemberUidsAfterHeal(
  existingMemberUids: readonly string[],
  uid: string,
  returningMemberUid?: string,
): string[] {
  const withoutReturning =
    returningMemberUid != null
      ? existingMemberUids.filter((memberUid) => memberUid !== returningMemberUid)
      : [...existingMemberUids];

  return Array.from(new Set([...withoutReturning, uid]));
}

/**
 * When membership heal removes the current host uid, return the promotee to write.
 * Returns null when hostUid should stay unchanged.
 */
export function resolveHostUidAfterHeal(input: {
  currentHostUid: string;
  memberUidsAfterHeal: readonly string[];
  memberRolesAfterHeal: Record<string, PlayerRole | string>;
  removedUid: string | undefined;
}): string | null {
  const { currentHostUid, memberUidsAfterHeal, memberRolesAfterHeal, removedUid } =
    input;

  if (removedUid == null || removedUid !== currentHostUid) {
    return null;
  }

  if (memberUidsAfterHeal.includes(currentHostUid)) {
    return null;
  }

  return pickHostPromotee(
    memberUidsAfterHeal,
    memberRolesAfterHeal,
    currentHostUid,
  );
}

export type MembershipHealState = {
  memberUids: string[];
  memberRoles: Record<string, PlayerRole>;
  memberAppVersions: Record<string, string>;
  /** Host after heal (promotee or unchanged). */
  hostUid: string;
  /** Non-null when the write must include hostUid. */
  nextHostUid: string | null;
};

/**
 * Build membership maps + optional host transfer for an auth-drift heal / join.
 */
export function buildMembershipHealState(input: {
  existingMemberUids: readonly string[];
  existingRoles: Record<string, PlayerRole>;
  existingAppVersions: Record<string, string>;
  uid: string;
  role: PlayerRole;
  clientVersion: string;
  returningMemberUid?: string;
  currentHostUid: string;
}): MembershipHealState {
  const removedUid =
    input.returningMemberUid != null && input.returningMemberUid !== input.uid
      ? input.returningMemberUid
      : undefined;

  const memberUids = buildMemberUidsAfterHeal(
    input.existingMemberUids,
    input.uid,
    input.returningMemberUid,
  );
  const memberRoles = { ...input.existingRoles, [input.uid]: input.role };
  if (removedUid != null) {
    delete memberRoles[removedUid];
  }
  const memberAppVersions = {
    ...input.existingAppVersions,
    [input.uid]: input.clientVersion,
  };
  if (removedUid != null) {
    delete memberAppVersions[removedUid];
  }

  const currentHostUid = input.currentHostUid;
  const nextHostUid =
    currentHostUid.length > 0
      ? resolveHostUidAfterHeal({
          currentHostUid,
          memberUidsAfterHeal: memberUids,
          memberRolesAfterHeal: memberRoles,
          removedUid,
        })
      : null;

  return {
    memberUids,
    memberRoles,
    memberAppVersions,
    hostUid: nextHostUid ?? currentHostUid,
    nextHostUid,
  };
}
