function parseVersionParts(version) {
  const base = version.split("-")[0]?.trim() ?? "";
  const parts = base.split(".").map((part) => {
    const num = Number.parseInt(part, 10);
    return Number.isFinite(num) ? num : 0;
  });
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 0];
}

export function compareAppVersions(a, b) {
  const aParts = parseVersionParts(a);
  const bParts = parseVersionParts(b);

  for (let index = 0; index < aParts.length; index += 1) {
    const aPart = aParts[index] ?? 0;
    const bPart = bParts[index] ?? 0;
    if (aPart !== bPart) {
      return aPart < bPart ? -1 : 1;
    }
  }

  return 0;
}

export function sessionVersionCompatible(session, clientVersion, uid, returningMemberUid, joinRole) {
  if (joinRole === "observer" || joinRole === "admin") {
    return true;
  }

  if (Array.isArray(session.memberUids) && session.memberUids.includes(uid)) {
    return true;
  }

  if (
    returningMemberUid &&
    Array.isArray(session.memberUids) &&
    session.memberUids.includes(returningMemberUid)
  ) {
    return true;
  }

  if (!session.hostAppVersion) {
    return true;
  }

  return compareAppVersions(clientVersion, session.hostAppVersion) >= 0;
}
