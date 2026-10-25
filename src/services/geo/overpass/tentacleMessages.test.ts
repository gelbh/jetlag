import { describe, expect, it } from "vitest";
import { tentacleEmptyPlayAreaMessage } from "./tentacleMessages";

describe("tentacleEmptyPlayAreaMessage", () => {
  it("names the category in the play-area empty notice", () => {
    expect(tentacleEmptyPlayAreaMessage("museum")).toBe("No named museum found in this play area.");
    expect(tentacleEmptyPlayAreaMessage("zoo")).toBe("No named zoo found in this play area.");
  });
});
