import { describe, expect, it } from "vitest";
import { readUserProfile } from "./firestoreProfile";

describe("firestoreProfile", () => {
  it("returns null until profile reads are implemented", async () => {
    await expect(readUserProfile("user-1")).resolves.toBeNull();
  });
});
