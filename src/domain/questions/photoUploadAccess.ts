import { FirebaseError } from "firebase/app";
import type { SessionRecord } from "../map/annotations";

export function isStorageUnauthorized(error: unknown): boolean {
  if (error instanceof FirebaseError) {
    return error.code === "storage/unauthorized";
  }

  const message = error instanceof Error ? error.message : String(error);
  return message.includes("storage/unauthorized");
}

export function photoUploadAccessError(
  session: Pick<SessionRecord, "memberUids" | "memberRoles"> | null | undefined,
  myUid: string | null | undefined,
): string | null {
  if (!myUid) {
    return "Sign in to upload photo answers.";
  }

  if (!session) {
    return "Syncing session… Try again in a moment.";
  }

  if (!session.memberUids?.includes(myUid)) {
    return "You are not a member of this session. Rejoin with the session code.";
  }

  if (!session.memberRoles || Object.keys(session.memberRoles).length === 0) {
    return "This session was created before role tracking. Ask the host to start a new session for photo answers.";
  }

  if (session.memberRoles[myUid] === undefined) {
    return "Syncing your role… Try again in a moment.";
  }

  if (session.memberRoles[myUid] !== "hider") {
    return "Only hiders can upload photo answers.";
  }

  return null;
}

export function formatPhotoStorageError(
  error: unknown,
  session?: Pick<SessionRecord, "memberUids" | "memberRoles"> | null,
  myUid?: string | null,
): string {
  const message =
    error instanceof Error ? error.message : "Could not upload the photo.";

  if (!isStorageUnauthorized(error)) {
    return message;
  }

  if (!session?.memberRoles || Object.keys(session.memberRoles).length === 0) {
    return "This session was created before role tracking. Ask the host to start a new session for photo answers.";
  }

  if (myUid && !session.memberUids?.includes(myUid)) {
    return "You are not a member of this session. Rejoin with the session code.";
  }

  if (myUid && session.memberRoles[myUid] !== "hider") {
    return "Only hiders can upload photo answers. Rejoin as hider if you switched roles.";
  }

  if (myUid && session.memberRoles?.[myUid] === undefined) {
    return "Your role is still syncing. Wait a moment and try again.";
  }

  return "Photo upload denied. Your role may still be syncing — wait a moment and retry.";
}
