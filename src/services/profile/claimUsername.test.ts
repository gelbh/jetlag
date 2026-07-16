import { FirebaseError } from "firebase/app";
import { describe, expect, it, vi } from "vitest";
import { claimUsername } from "./claimUsername";

const callable = vi.hoisted(() =>
  vi.fn(async () => ({ data: { username: "mapfox" } })),
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

describe("claimUsername", () => {
  it("calls the claimUsername callable with the username", async () => {
    const result = await claimUsername("MapFox");

    expect(httpsCallable).toHaveBeenCalledWith({}, "claimUsername");
    expect(callable).toHaveBeenCalledWith({ username: "MapFox" });
    expect(result).toEqual({ username: "mapfox" });
  });

  it("throws when Firebase is not configured", async () => {
    isFirebaseConfigured.mockReturnValueOnce(false);

    await expect(claimUsername("mapfox")).rejects.toThrow(
      "Firebase is not configured.",
    );
  });

  it("maps FirebaseError messages to readable errors", async () => {
    callable.mockRejectedValueOnce(
      new FirebaseError("functions/already-exists", "That username is taken."),
    );

    await expect(claimUsername("mapfox")).rejects.toThrow(
      "That username is taken.",
    );
  });

  it("maps generic INTERNAL callable errors to fallback text", async () => {
    callable.mockRejectedValueOnce(
      new FirebaseError("functions/internal", "INTERNAL"),
    );

    await expect(claimUsername("mapfox")).rejects.toThrow(
      "Could not claim that username.",
    );
  });
});
