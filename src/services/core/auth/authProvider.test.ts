import { describe, expect, it } from "vitest";
import { mapFirebaseAuthProvider } from "./authProvider";

describe("mapFirebaseAuthProvider", () => {
  it("maps known Firebase provider ids", () => {
    expect(mapFirebaseAuthProvider("google.com")).toBe("google");
    expect(mapFirebaseAuthProvider("apple.com")).toBe("apple");
    expect(mapFirebaseAuthProvider("password")).toBe("email");
  });

  it("maps unknown and empty to unknown", () => {
    expect(mapFirebaseAuthProvider("github.com")).toBe("unknown");
    expect(mapFirebaseAuthProvider(null)).toBe("unknown");
    expect(mapFirebaseAuthProvider(undefined)).toBe("unknown");
    expect(mapFirebaseAuthProvider("")).toBe("unknown");
  });
});
