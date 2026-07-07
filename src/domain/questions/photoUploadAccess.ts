import type { SessionRecord } from "../map/annotations";

export function photoUploadAccessError(
  session: Pick<SessionRecord, "memberUids" | "memberRoles"> | null | undefined,
  myUid: string | null | undefined,
): string | null {
  if (!myUid) {
    return "Sign in to upload photo answers.";
  }

  if (!session?.memberUids?.includes(myUid)) {
    return "You are not a member of this session. Rejoin with the session code.";
  }

  if (!session.memberRoles || Object.keys(session.memberRoles).length === 0) {
    return "This session was created before role tracking. Ask the host to start a new session for photo answers.";
  }

  if (session.memberRoles[myUid] !== "hider") {
    return "Only hiders can upload photo answers.";
  }

  return null;
}

export function formatPhotoStorageError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : "Could not upload the photo.";

  if (message.includes("storage/unauthorized")) {
    return "Photo upload denied. Rejoin as hider, or ask the host to start a new session.";
  }

  return message;
}
