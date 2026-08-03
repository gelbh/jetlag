import { describe, expect, it } from "vitest";
import { buildJoinRequestIdentityLabel } from "./joinRequestIdentity";

describe("buildJoinRequestIdentityLabel", () => {
  it("prefers username, then email, then Anonymous player", () => {
    expect(
      buildJoinRequestIdentityLabel({ username: "ada", email: "a@b.c" }),
    ).toBe("ada");
    expect(buildJoinRequestIdentityLabel({ email: "a@b.c" })).toBe("a@b.c");
    expect(buildJoinRequestIdentityLabel({})).toBe("Anonymous player");
  });
});
