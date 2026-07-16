import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions, isFirebaseConfigured } from "../core/firebase";

export interface FriendListEntry {
  uid: string;
  username: string;
}

export interface FriendsListResult {
  friends: FriendListEntry[];
  incoming: FriendListEntry[];
  outgoing: FriendListEntry[];
}

export interface FriendSearchResult {
  results: FriendListEntry[];
}

async function callProfileFriends<T>(
  data: Record<string, unknown>,
): Promise<T> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase is not configured.");
  }
  const functions = await getFirebaseFunctions();
  const callable = httpsCallable<Record<string, unknown>, T>(
    functions,
    "profileFriends",
  );
  try {
    const result = await callable(data);
    return result.data;
  } catch (error) {
    throw new Error(mapFriendsError(error), { cause: error });
  }
}

function mapFriendsError(error: unknown): string {
  if (error instanceof FirebaseError) {
    if (error.message) {
      return error.message.replace(/^Firebase:\s*/i, "").replace(/\s*\(.*\)$/, "");
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Friends action failed.";
}

export function searchFriends(query: string): Promise<FriendSearchResult> {
  return callProfileFriends({ action: "search", query });
}

export function requestFriend(toUid: string): Promise<{ ok: boolean }> {
  return callProfileFriends({ action: "request", toUid });
}

export function acceptFriendRequest(fromUid: string): Promise<{ ok: boolean }> {
  return callProfileFriends({ action: "accept", fromUid });
}

export function declineFriendRequest(fromUid: string): Promise<{ ok: boolean }> {
  return callProfileFriends({ action: "decline", fromUid });
}

export function cancelFriendRequest(toUid: string): Promise<{ ok: boolean }> {
  return callProfileFriends({ action: "cancel", toUid });
}

export function listFriends(): Promise<FriendsListResult> {
  return callProfileFriends({ action: "list" });
}
