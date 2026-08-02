import { pickHostPromotee } from "./pickHostPromotee.mjs";
import { pickRoleLeaderPromotee } from "./pickRoleLeaderPromotee.mjs";
import { newRoleSecret } from "./rolePasscodes.mjs";

export function isRoleGatedSession(data) {
  return (
    data?.roleGates?.version === 1 &&
    data.roleGates != null &&
    typeof data.roleGates === "object"
  );
}

export function buildRoleGatesForHost(hostUid, hostRole) {
  const leaders = {};

  if (hostRole === "seeker" || hostRole === "hider") {
    leaders[hostRole] = hostUid;
  }

  return { version: 1, leaders };
}

export function countMembersWithRole(memberRoles, role) {
  if (!memberRoles || typeof memberRoles !== "object") {
    return 0;
  }

  return Object.values(memberRoles).filter((memberRole) => memberRole === role)
    .length;
}

export function buildMemberUidsAfterHeal(existingMemberUids, uid, returningMemberUid) {
  const withoutReturning =
    returningMemberUid != null
      ? existingMemberUids.filter((memberUid) => memberUid !== returningMemberUid)
      : [...existingMemberUids];

  return Array.from(new Set([...withoutReturning, uid]));
}

export function buildMembershipHealState(input) {
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

  let nextHostUid = null;
  let hostUid = input.currentHostUid;
  if (
    removedUid != null &&
    removedUid === input.currentHostUid &&
    !memberUids.includes(input.currentHostUid)
  ) {
    const promotee = pickHostPromotee(
      memberUids,
      memberRoles,
      input.currentHostUid,
    );
    if (promotee != null) {
      hostUid = promotee;
      nextHostUid = promotee;
    }
  }

  return {
    memberUids,
    memberRoles,
    memberAppVersions,
    hostUid,
    nextHostUid,
    removedUid,
  };
}

export function roleHasOtherMembers(memberRoles, role, excludeUid) {
  if (!memberRoles || typeof memberRoles !== "object") {
    return false;
  }

  return Object.entries(memberRoles).some(
    ([uid, memberRole]) => uid !== excludeUid && memberRole === role,
  );
}

export function promoteOrClearRoleLeader(roleGates, memberUids, memberRoles, role, excludeUid) {
  const nextLeaders = { ...(roleGates?.leaders ?? {}) };
  const promotee = pickRoleLeaderPromotee(memberUids, memberRoles, role, excludeUid);

  if (promotee == null) {
    delete nextLeaders[role];
    return { roleGates: { version: 1, leaders: nextLeaders }, clearSecret: true };
  }

  nextLeaders[role] = promotee;
  return { roleGates: { version: 1, leaders: nextLeaders }, clearSecret: false };
}

export function buildInitialRoleSecrets(hostRole) {
  const secrets = {
    observer: newRoleSecret(),
  };

  if (hostRole === "seeker" || hostRole === "hider") {
    secrets[hostRole] = newRoleSecret();
  }

  return secrets;
}

export function removeMemberFromMaps(memberUids, memberRoles, memberAppVersions, uid) {
  return {
    memberUids: memberUids.filter((memberUid) => memberUid !== uid),
    memberRoles: Object.fromEntries(
      Object.entries(memberRoles).filter(([memberUid]) => memberUid !== uid),
    ),
    memberAppVersions: Object.fromEntries(
      Object.entries(memberAppVersions).filter(([memberUid]) => memberUid !== uid),
    ),
  };
}
