import { describe, expect, it } from "vitest";
import { isAnonymousUser, isPermanentUser } from "./accountAuth";

describe("accountAuth", () => {
  it("detects anonymous users", () => {
    expect(isAnonymousUser({ isAnonymous: true } as never)).toBe(true);
    expect(isAnonymousUser({ isAnonymous: false } as never)).toBe(false);
    expect(isAnonymousUser(null)).toBe(false);
  });

  it("detects permanent users", () => {
    expect(isPermanentUser({ isAnonymous: false } as never)).toBe(true);
    expect(isPermanentUser({ isAnonymous: true } as never)).toBe(false);
    expect(isPermanentUser(null)).toBe(false);
  });
});
