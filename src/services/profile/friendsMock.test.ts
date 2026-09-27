import { beforeEach, describe, expect, it } from "vitest";
import {
  FRIENDS_MOCK_SESSION_CODE,
  FRIENDS_MOCK_STORAGE_KEY,
  getFriendSheetProfile,
  getFriendsMockSessionCode,
  mockAcceptFriendRequest,
  mockCancelFriendRequest,
  mockDeclineFriendRequest,
  mockListFriends,
  mockRemoveFriend,
  mockRequestFriend,
  mockSearchFriends,
  resetFriendsMock,
} from "./friendsMock";

describe("friendsMock", () => {
  beforeEach(() => {
    localStorage.setItem(FRIENDS_MOCK_STORAGE_KEY, "1");
    resetFriendsMock();
  });

  it("seeds friends, incoming, and outgoing lists", async () => {
    const list = await mockListFriends();
    expect(list.friends.length).toBeGreaterThanOrEqual(3);
    expect(list.incoming.length).toBeGreaterThanOrEqual(2);
    expect(list.outgoing.length).toBeGreaterThanOrEqual(1);
  });

  it("exposes a mock active session code for invites", () => {
    expect(getFriendsMockSessionCode()).toBe(FRIENDS_MOCK_SESSION_CODE);
    localStorage.removeItem(FRIENDS_MOCK_STORAGE_KEY);
    expect(getFriendsMockSessionCode()).toBeNull();
  });

  it("returns sheet profile stats for seeded friends", () => {
    localStorage.setItem(FRIENDS_MOCK_STORAGE_KEY, "1");
    const profile = getFriendSheetProfile("mock-friend-1");
    expect(profile.gamesTogether).toBe(14);
    expect(profile.lastPlayedLabel).toContain("Dublin");
  });

  it("removes a friend from the list", async () => {
    const before = await mockListFriends();
    const target = before.friends[0]!;
    await mockRemoveFriend(target.uid);
    const after = await mockListFriends();
    expect(after.friends.some((entry) => entry.uid === target.uid)).toBe(false);
  });

  it("searches the directory by prefix", async () => {
    const result = await mockSearchFriends("bo");
    expect(result.results.map((entry) => entry.username)).toEqual(
      expect.arrayContaining(["bob", "bobby_tables", "bora_bora"]),
    );
  });

  it("moves incoming to friends on accept", async () => {
    const before = await mockListFriends();
    const target = before.incoming[0]!;
    await mockAcceptFriendRequest(target.uid);
    const after = await mockListFriends();
    expect(after.incoming.some((entry) => entry.uid === target.uid)).toBe(
      false,
    );
    expect(after.friends.some((entry) => entry.uid === target.uid)).toBe(true);
  });

  it("supports decline, cancel, and request flows", async () => {
    const before = await mockListFriends();
    const incoming = before.incoming[0]!;
    const outgoing = before.outgoing[0]!;

    await mockDeclineFriendRequest(incoming.uid);
    await mockCancelFriendRequest(outgoing.uid);

    const searchable = await mockSearchFriends("nova");
    const hit = searchable.results[0]!;
    await mockRequestFriend(hit.uid);

    const after = await mockListFriends();
    expect(after.incoming.some((entry) => entry.uid === incoming.uid)).toBe(
      false,
    );
    expect(after.outgoing.some((entry) => entry.uid === outgoing.uid)).toBe(
      false,
    );
    expect(after.outgoing.some((entry) => entry.uid === hit.uid)).toBe(true);
  });
});
