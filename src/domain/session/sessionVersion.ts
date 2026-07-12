import type { SessionRecord } from "../map/annotations";
import type { PlayerRole } from "./playerRole";

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

  return session.hostAppVersion === clientVersion;
}

export function sessionVersionMismatchMessage(hostVersion: string): string {
  return `This session requires v${hostVersion}. Update the app to join.`;
}
