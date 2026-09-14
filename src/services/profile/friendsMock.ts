import type {
  FriendListEntry,
  FriendSearchResult,
  FriendsListResult,
} from "./profileFriends";

export const FRIENDS_MOCK_STORAGE_KEY = "jl.friends.mock";
/** Four-letter code used when inviting from the friends mock sheet. */
export const FRIENDS_MOCK_SESSION_CODE = "PLAY";

const MOCK_LATENCY_MS = 280;

/** Presentation extras for the friend detail sheet (mock / offline polish). */
export type FriendSheetProfile = {
  gamesTogether: number | null;
  winsTogether: number | null;
  mutualFriends: number | null;
  lastPlayedLabel: string | null;
  requestedAgoLabel: string | null;
};

const EMPTY_SHEET_PROFILE: FriendSheetProfile = {
  gamesTogether: null,
  winsTogether: null,
  mutualFriends: null,
  lastPlayedLabel: null,
  requestedAgoLabel: null,
};

const MOCK_SHEET_PROFILES: Record<string, FriendSheetProfile> = {
  "mock-friend-1": {
    gamesTogether: 14,
    winsTogether: 6,
    mutualFriends: 2,
    lastPlayedLabel: "Dublin · 3d ago",
    requestedAgoLabel: null,
  },
  "mock-friend-2": {
    gamesTogether: 8,
    winsTogether: 3,
    mutualFriends: 1,
    lastPlayedLabel: "Osaka · 1w ago",
    requestedAgoLabel: null,
  },
  "mock-friend-3": {
    gamesTogether: 21,
    winsTogether: 11,
    mutualFriends: 4,
    lastPlayedLabel: "Lucerne · yesterday",
    requestedAgoLabel: null,
  },
  "mock-friend-4": {
    gamesTogether: 3,
    winsTogether: 1,
    mutualFriends: 0,
    lastPlayedLabel: "Local · 2w ago",
    requestedAgoLabel: null,
  },
  "mock-in-1": {
    ...EMPTY_SHEET_PROFILE,
    requestedAgoLabel: "2d ago",
    mutualFriends: 1,
  },
  "mock-in-2": {
    ...EMPTY_SHEET_PROFILE,
    requestedAgoLabel: "5h ago",
  },
  "mock-in-3": {
    ...EMPTY_SHEET_PROFILE,
    requestedAgoLabel: "1w ago",
    mutualFriends: 2,
  },
  "mock-out-1": {
    ...EMPTY_SHEET_PROFILE,
    requestedAgoLabel: "3d ago",
  },
  "mock-out-2": {
    ...EMPTY_SHEET_PROFILE,
    requestedAgoLabel: "1d ago",
  },
  "mock-dir-1": {
    ...EMPTY_SHEET_PROFILE,
    mutualFriends: 3,
  },
  "mock-dir-2": {
    ...EMPTY_SHEET_PROFILE,
    mutualFriends: 0,
  },
  "mock-dir-3": {
    ...EMPTY_SHEET_PROFILE,
    mutualFriends: 1,
  },
};

function cloneEntry(entry: FriendListEntry): FriendListEntry {
  return { uid: entry.uid, username: entry.username };
}

function seedDirectory(): FriendListEntry[] {
  return [
    { uid: "mock-friend-1", username: "ally_fox" },
    { uid: "mock-friend-2", username: "map_runner" },
    { uid: "mock-friend-3", username: "dublin_hider" },
    { uid: "mock-friend-4", username: "seek_squad" },
    { uid: "mock-in-1", username: "seeker_one" },
    { uid: "mock-in-2", username: "radar_ray" },
    { uid: "mock-in-3", username: "tentacle_tom" },
    { uid: "mock-out-1", username: "pending_pal" },
    { uid: "mock-out-2", username: "wait_willow" },
    { uid: "mock-dir-1", username: "bob" },
    { uid: "mock-dir-2", username: "bobby_tables" },
    { uid: "mock-dir-3", username: "bora_bora" },
    { uid: "mock-dir-4", username: "nova_nav" },
    { uid: "mock-dir-5", username: "cipher_cat" },
    { uid: "mock-dir-6", username: "zone_zen" },
    { uid: "mock-dir-7", username: "pin_piper" },
  ];
}

type MockState = {
  friends: FriendListEntry[];
  incoming: FriendListEntry[];
  outgoing: FriendListEntry[];
  directory: FriendListEntry[];
};

function createSeedState(): MockState {
  const directory = seedDirectory();
  const byUid = new Map(directory.map((entry) => [entry.uid, entry]));
  const pick = (uid: string) => cloneEntry(byUid.get(uid)!);

  return {
    directory,
    friends: [
      pick("mock-friend-1"),
      pick("mock-friend-2"),
      pick("mock-friend-3"),
      pick("mock-friend-4"),
    ],
    incoming: [pick("mock-in-1"), pick("mock-in-2"), pick("mock-in-3")],
    outgoing: [pick("mock-out-1"), pick("mock-out-2")],
  };
}

let state: MockState = createSeedState();

export function isFriendsMockEnabled(): boolean {
  try {
    return (
      import.meta.env.DEV &&
      localStorage.getItem(FRIENDS_MOCK_STORAGE_KEY) === "1"
    );
  } catch {
    return false;
  }
}

/** Active session code for invite-to-game when friends mock is on. */
export function getFriendsMockSessionCode(): string | null {
  return isFriendsMockEnabled() ? FRIENDS_MOCK_SESSION_CODE : null;
}

/** Sheet stats / captions. Empty when mock is off or uid unknown. */
export function getFriendSheetProfile(uid: string): FriendSheetProfile {
  if (!isFriendsMockEnabled()) {
    return EMPTY_SHEET_PROFILE;
  }
  return MOCK_SHEET_PROFILES[uid] ?? EMPTY_SHEET_PROFILE;
}

export function setFriendsMockEnabled(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(FRIENDS_MOCK_STORAGE_KEY, "1");
    } else {
      localStorage.removeItem(FRIENDS_MOCK_STORAGE_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}

/** Reset seed (tests + console). */
export function resetFriendsMock(): void {
  state = createSeedState();
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), MOCK_LATENCY_MS);
  });
}

function relatedUids(): Set<string> {
  return new Set(
    [...state.friends, ...state.incoming, ...state.outgoing].map(
      (entry) => entry.uid,
    ),
  );
}

export async function mockListFriends(): Promise<FriendsListResult> {
  return delay({
    friends: state.friends.map(cloneEntry),
    incoming: state.incoming.map(cloneEntry),
    outgoing: state.outgoing.map(cloneEntry),
  });
}

export async function mockSearchFriends(
  query: string,
): Promise<FriendSearchResult> {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) {
    throw new Error("Enter at least 2 characters to search.");
  }
  const related = relatedUids();
  const results = state.directory
    .filter(
      (entry) =>
        !related.has(entry.uid) &&
        entry.username.toLowerCase().startsWith(normalized),
    )
    .map(cloneEntry);
  return delay({ results });
}

export async function mockRequestFriend(
  toUid: string,
): Promise<{ ok: boolean }> {
  if (relatedUids().has(toUid)) {
    throw new Error("Already connected or pending with that player.");
  }
  const target = state.directory.find((entry) => entry.uid === toUid);
  if (!target) {
    throw new Error("User not found.");
  }
  state.outgoing = [...state.outgoing, cloneEntry(target)];
  return delay({ ok: true });
}

export async function mockAcceptFriendRequest(
  fromUid: string,
): Promise<{ ok: boolean }> {
  const incoming = state.incoming.find((entry) => entry.uid === fromUid);
  if (!incoming) {
    throw new Error("No pending request from that player.");
  }
  state.incoming = state.incoming.filter((entry) => entry.uid !== fromUid);
  state.friends = [...state.friends, cloneEntry(incoming)];
  return delay({ ok: true });
}

export async function mockDeclineFriendRequest(
  fromUid: string,
): Promise<{ ok: boolean }> {
  if (!state.incoming.some((entry) => entry.uid === fromUid)) {
    throw new Error("No pending request from that player.");
  }
  state.incoming = state.incoming.filter((entry) => entry.uid !== fromUid);
  return delay({ ok: true });
}

export async function mockCancelFriendRequest(
  toUid: string,
): Promise<{ ok: boolean }> {
  if (!state.outgoing.some((entry) => entry.uid === toUid)) {
    throw new Error("No outgoing request to that player.");
  }
  state.outgoing = state.outgoing.filter((entry) => entry.uid !== toUid);
  return delay({ ok: true });
}

export async function mockRemoveFriend(
  friendUid: string,
): Promise<{ ok: boolean }> {
  if (!state.friends.some((entry) => entry.uid === friendUid)) {
    throw new Error("That player is not on your friends list.");
  }
  state.friends = state.friends.filter((entry) => entry.uid !== friendUid);
  return delay({ ok: true });
}
