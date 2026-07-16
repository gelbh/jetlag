import { FirebaseError } from "firebase/app";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  listFriends,
  requestFriend,
  searchFriends,
} from "./profileFriends";

const callable = vi.hoisted(() =>
  vi.fn(async (): Promise<{ data: unknown }> => ({
    data: { results: [{ uid: "u2", username: "bob" }] },
  })),
);
const httpsCallable = vi.hoisted(() => vi.fn(() => callable));
const getFirebaseFunctions = vi.hoisted(() => vi.fn(async () => ({})));
const isFirebaseConfigured = vi.hoisted(() => vi.fn(() => true));

vi.mock("../core/firebase", () => ({
  getFirebaseFunctions,
  isFirebaseConfigured,
}));

vi.mock("firebase/functions", () => ({
  httpsCallable,
}));

describe("profileFriends", () => {
  beforeEach(() => {
    callable.mockReset();
    callable.mockResolvedValue({
      data: { results: [{ uid: "u2", username: "bob" }] },
    });
    httpsCallable.mockClear();
    isFirebaseConfigured.mockReturnValue(true);
  });

  it("searches via profileFriends callable", async () => {
    const result = await searchFriends("bo");
    expect(httpsCallable).toHaveBeenCalledWith({}, "profileFriends");
    expect(callable).toHaveBeenCalledWith({ action: "search", query: "bo" });
    expect(result.results).toEqual([{ uid: "u2", username: "bob" }]);
  });

  it("requests, accepts, declines, cancels, and lists", async () => {
    callable.mockResolvedValue({ data: { ok: true } });
    await expect(requestFriend("u2")).resolves.toEqual({ ok: true });
    expect(callable).toHaveBeenCalledWith({ action: "request", toUid: "u2" });

    await expect(acceptFriendRequest("u2")).resolves.toEqual({ ok: true });
    expect(callable).toHaveBeenCalledWith({ action: "accept", fromUid: "u2" });

    await expect(declineFriendRequest("u2")).resolves.toEqual({ ok: true });
    expect(callable).toHaveBeenCalledWith({ action: "decline", fromUid: "u2" });

    await expect(cancelFriendRequest("u2")).resolves.toEqual({ ok: true });
    expect(callable).toHaveBeenCalledWith({ action: "cancel", toUid: "u2" });

    callable.mockResolvedValue({
      data: { friends: [], incoming: [], outgoing: [] },
    });
    await expect(listFriends()).resolves.toEqual({
      friends: [],
      incoming: [],
      outgoing: [],
    });
    expect(callable).toHaveBeenCalledWith({ action: "list" });
  });

  it("throws when Firebase is not configured", async () => {
    isFirebaseConfigured.mockReturnValueOnce(false);
    await expect(listFriends()).rejects.toThrow("Firebase is not configured.");
  });

  it("maps FirebaseError messages and preserves cause", async () => {
    const firebaseError = new FirebaseError(
      "functions/resource-exhausted",
      "Firebase: Too many friends actions. Try again later. (functions/resource-exhausted)",
    );
    callable.mockRejectedValueOnce(firebaseError);

    await expect(searchFriends("bo")).rejects.toMatchObject({
      message: "Too many friends actions. Try again later.",
      cause: firebaseError,
    });
  });

  it("falls back when the error has no message", async () => {
    callable.mockRejectedValueOnce({});
    await expect(listFriends()).rejects.toThrow("Friends action failed.");
  });
});
