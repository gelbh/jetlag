import { describe, expect, it } from "vitest";
import { isVetoAnswer, VETO_ANSWER, VETO_SELECTED_REPLY } from "./questionPowerUps";

describe("isVetoAnswer", () => {
  it("accepts the veto answer sentinel", () => {
    expect(isVetoAnswer(VETO_ANSWER)).toBe(true);
    expect(isVetoAnswer({ kind: "veto" })).toBe(true);
  });

  it("rejects non-veto answers", () => {
    expect(isVetoAnswer(null)).toBe(false);
    expect(isVetoAnswer(undefined)).toBe(false);
    expect(isVetoAnswer("veto")).toBe(false);
    expect(isVetoAnswer({ kind: "yes" })).toBe(false);
    expect(isVetoAnswer({ kind: "veto", extra: true })).toBe(true);
  });
});

describe("VETO_SELECTED_REPLY", () => {
  it("is the veto reply token", () => {
    expect(VETO_SELECTED_REPLY).toBe("veto");
  });
});
