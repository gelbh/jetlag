import { describe, expect, it } from "vitest";
import { matchingEmptyPlayAreaMessage, matchingNullAnswerMessage } from "./messages";

describe("matching empty play-area messages", () => {
  it("empty play area message has no null-match suffix", () => {
    expect(matchingEmptyPlayAreaMessage("landmass")).toBe("No landmass intersects the play area.");
    expect(matchingEmptyPlayAreaMessage("landmass")).not.toMatch(/null match/i);
  });

  it("null-answer message keeps the null-match suffix", () => {
    expect(matchingNullAnswerMessage("landmass")).toMatch(/null match/i);
    expect(matchingNullAnswerMessage("landmass")).toContain(
      matchingEmptyPlayAreaMessage("landmass"),
    );
  });
});
