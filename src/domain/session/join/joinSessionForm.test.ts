import { describe, expect, it } from "vitest";
import { joinSessionFormSchema } from "./joinSessionForm";

describe("joinSessionFormSchema", () => {
  it("accepts a valid join payload", () => {
    expect(
      joinSessionFormSchema.parse({
        code: "ABCD",
        playerRole: "hider",
        rolePasscode: "",
      }),
    ).toEqual({
      code: "ABCD",
      playerRole: "hider",
      rolePasscode: "",
    });
  });

  it("rejects a short session code", () => {
    const result = joinSessionFormSchema.safeParse({
      code: "AB",
      playerRole: "seeker",
      rolePasscode: "",
    });
    expect(result.success).toBe(false);
  });

  it("allows an unset player role before the host picks a side", () => {
    expect(
      joinSessionFormSchema.parse({
        code: "ABCD",
        playerRole: null,
        rolePasscode: "",
      }),
    ).toEqual({
      code: "ABCD",
      playerRole: null,
      rolePasscode: "",
    });
  });
});
