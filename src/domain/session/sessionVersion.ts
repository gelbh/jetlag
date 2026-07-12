import type { SessionRecord } from "../map/annotations";
import type { PlayerRole } from "./playerRole";

function parseVersionParts(version: string): [number, number, number] {
  const base = version.split("-")[0]?.trim() ?? "";
  const parts = base.split(".").map((part) => {
    const num = Number.parseInt(part, 10);
    return Number.isFinite(num) ? num : 0;
  });
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

export function compareAppVersions(a: string, b: string): -1 | 0 | 1 {
  const [aMajor, aMinor, aPatch] = parseVersionParts(a);
  const [bMajor, bMinor, bPatch] = parseVersionParts(b);

  if (aMajor !== bMajor) {
    return aMajor < bMajor ? -1 : 1;
  }
  if (aMinor !== bMinor) {
    return aMinor < bMinor ? -1 : 1;
  }
  if (aPatch !== bPatch) {
    return aPatch < bPatch ? -1 : 1;
  }
  return 0;
}

export function sessionVersionCompatible(
  session: Pick<SessionRecord, "hostAppVersion" | "memberUids">,
  clientVersion: string,
  uid: string,
  returningMemberUid?: string | null,
  joinRole?: PlayerRole,
): boolean {
  if (joinRole === "observer") {
    return true;
  }
  if (session.memberUids.includes(uid)) {
    return true;
  }

  if (
    returningMemberUid &&
    session.memberUids.includes(returningMemberUid)
  ) {
    return true;
  }

  if (!session.hostAppVersion) {
    return true;
  }

  return compareAppVersions(clientVersion, session.hostAppVersion) >= 0;
}

export function sessionVersionMismatchMessage(
  hostVersion: string,
  clientVersion?: string,
): string {
  if (clientVersion) {
    const comparison = compareAppVersions(clientVersion, hostVersion);
    if (comparison < 0) {
      return `This session requires v${hostVersion} or newer. Update the app to join.`;
    }
    if (comparison > 0) {
      return `This session was created on v${hostVersion}. Ask the host to start a new session if players can't join.`;
    }
  }

  return `This session requires v${hostVersion}. Update the app to join.`;
}
